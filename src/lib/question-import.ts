import * as XLSX from "xlsx";
import mammoth from "mammoth";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
} from "docx";
import { QuestionInsert, CognitiveLevel, SubjectItem, Semester } from "@/types";

export function normalizeSemester(raw: any): Semester {
  const s = String(raw || "").trim().toLowerCase();
  if (s === "2" || s.includes("2") || s.includes("genap") || s.includes("ii")) return 2;
  return 1;
}

export interface ParseImportResult {
  valid: QuestionInsert[];
  skipped: number;
  error?: string;
}

export function normalizeLevel(raw: any): CognitiveLevel {
  const s = String(raw || "").trim().toUpperCase();
  if (s.includes("HOTS") || s.includes("C4") || s.includes("C5") || s.includes("C6")) return "HOTS";
  if (s.includes("MED") || s.includes("MENENGAH") || s.includes("C3")) return "Medium";
  return "Easy";
}

function pickField(row: Record<string, any>, candidates: string[]): string {
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const found = keys.find((k) => k.trim().toLowerCase() === cand.toLowerCase());
    if (found && row[found] !== undefined && row[found] !== null) {
      return String(row[found]).trim();
    }
  }
  for (const cand of candidates) {
    const found = keys.find((k) => k.trim().toLowerCase().includes(cand.toLowerCase()));
    if (found && row[found] !== undefined && row[found] !== null) {
      return String(row[found]).trim();
    }
  }
  return "";
}

function rowObjectToQuestion(
  row: Record<string, any>,
  teacherSubject: string,
  isSubjectRestricted: boolean,
  subjects: SubjectItem[]
): QuestionInsert | null {
  const questionText = pickField(row, ["Pertanyaan", "Soal", "Isi Soal", "Question"]);
  const answerText = pickField(row, ["Jawaban Benar", "Kunci Jawaban", "Jawaban", "Kunci", "Answer"]);
  if (!questionText || !answerText) return null;

  const rawSubject = pickField(row, ["Mata Pelajaran", "Mapel", "Subject"]);
  const subject = isSubjectRestricted
    ? teacherSubject
    : rawSubject || subjects[0]?.name || "IPAS / Sains";

  const topic = pickField(row, ["Materi / Topik", "Materi", "Topik", "Topic"]) || "Materi Pokok";
  const semester = normalizeSemester(pickField(row, ["Semester", "Sem"]));
  const level = normalizeLevel(
    pickField(row, ["Tingkat (Easy/Medium/HOTS)", "Tingkat", "Level", "Difficulty"])
  );
  const p1 = pickField(row, ["Pengecoh 1", "Salah 1", "Distractor 1"]);
  const p2 = pickField(row, ["Pengecoh 2", "Salah 2", "Distractor 2"]);
  const p3 = pickField(row, ["Pengecoh 3", "Salah 3", "Distractor 3"]);
  // Hanya ambil kolom "Pengecoh" / "Pilihan Salah" jika tidak tumpang tindih dengan Pengecoh 1/2/3
  const pListKey = Object.keys(row).find((k) => {
    const kl = k.trim().toLowerCase();
    return kl === "pengecoh" || kl === "pilihan salah";
  });
  const pListRaw = pListKey && row[pListKey] != null ? String(row[pListKey]).trim() : "";
  const extraWrong = pListRaw ? pListRaw.split(/[,;|]+/).map((s) => s.trim()) : [];

  const wrongAnswers = Array.from(
    new Set(
      [p1, p2, p3, ...extraWrong]
        .map((w) => w.trim())
        .filter((w) => w.length > 0 && w.toLowerCase() !== answerText.toLowerCase())
    )
  ).slice(0, 3);

  const rawKeywords = pickField(row, ["Kata Kunci Argumentasi", "Kata Kunci", "Keywords"]);
  const keywords = rawKeywords
    .split(/[,;]+/)
    .map((k) => k.trim())
    .filter(Boolean);

  const explanation =
    pickField(row, ["Pembahasan", "Penjelasan", "Explanation"]) ||
    `Jawaban yang tepat adalah ${answerText}.`;

  return {
    subject,
    topic,
    semester,
    difficulty_level: level,
    question_text: questionText,
    question_image_url: null,
    answer_text: answerText,
    answer_image_url: null,
    wrong_answers: wrongAnswers,
    keywords,
    explanation,
    is_active: true,
  };
}

/**
 * Parse file Excel (.xlsx, .xls, .csv)
 */
export async function parseExcelQuestions(
  file: File,
  teacherSubject: string,
  isSubjectRestricted: boolean,
  subjects: SubjectItem[]
): Promise<ParseImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: "" });

  if (!rawRows || rawRows.length === 0) {
    return { valid: [], skipped: 0, error: "File Excel kosong atau tidak memiliki baris data." };
  }

  const valid: QuestionInsert[] = [];
  let skipped = 0;

  for (const row of rawRows) {
    const q = rowObjectToQuestion(row, teacherSubject, isSubjectRestricted, subjects);
    if (q) valid.push(q);
    else skipped++;
  }

  return {
    valid,
    skipped,
    error:
      valid.length === 0
        ? "Tidak ada baris soal yang valid. Pastikan kolom 'Pertanyaan' dan 'Jawaban Benar' terisi."
        : undefined,
  };
}

/**
 * Parse teks terstruktur dari Word (.docx) seperti:
 * 1. Pertanyaan...
 * A. Pilihan A ... / Pengecoh: ...
 * Jawaban: ...
 * Kata Kunci: ...
 * Pembahasan: ...
 */
function parseStructuredWordText(
  rawText: string,
  teacherSubject: string,
  isSubjectRestricted: boolean,
  subjects: SubjectItem[]
): ParseImportResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const valid: QuestionInsert[] = [];
  let skipped = 0;

  interface DraftQ {
    subject: string;
    topic: string;
    semester: string;
    level: string;
    question: string;
    answer: string;
    wrong: string[];
    options: Record<string, string>;
    keywords: string;
    explanation: string;
  }

  let current: DraftQ | null = null;
  const defaultSub = isSubjectRestricted
    ? teacherSubject
    : subjects[0]?.name || "IPAS / Sains";

  const flushCurrent = () => {
    if (!current) return;
    let finalAnswer = current.answer.trim();
    const finalWrong = [...current.wrong];

    // Jika guru memakai format A/B/C/D dan Jawaban berupa huruf (misal "A")
    const optKeys = Object.keys(current.options);
    if (optKeys.length > 0) {
      const letterMatch = finalAnswer.toUpperCase().match(/^([A-D])$/);
      if (letterMatch && current.options[letterMatch[1]]) {
        const correctLetter = letterMatch[1];
        finalAnswer = current.options[correctLetter];
        for (const k of optKeys) {
          if (k !== correctLetter && current.options[k]) {
            finalWrong.push(current.options[k]);
          }
        }
      } else {
        for (const k of optKeys) {
          const val = current.options[k];
          if (val && val.toLowerCase() !== finalAnswer.toLowerCase()) {
            finalWrong.push(val);
          }
        }
      }
    }

    if (!current.question.trim() || !finalAnswer) {
      skipped++;
      return;
    }

    const keywords = current.keywords
      .split(/[,;]+/)
      .map((k) => k.trim())
      .filter(Boolean);

    valid.push({
      subject: isSubjectRestricted ? teacherSubject : current.subject || defaultSub,
      topic: current.topic || "Materi Pokok",
      semester: normalizeSemester(current.semester),
      difficulty_level: normalizeLevel(current.level),
      question_text: current.question.trim(),
      question_image_url: null,
      answer_text: finalAnswer,
      answer_image_url: null,
      wrong_answers: Array.from(
        new Set(
          finalWrong
            .map((w) => w.trim())
            .filter((w) => w.length > 0 && w.toLowerCase() !== finalAnswer.toLowerCase())
        )
      ).slice(0, 3),
      keywords,
      explanation: current.explanation.trim() || `Jawaban yang tepat adalah ${finalAnswer}.`,
      is_active: true,
    });
  };

  for (const line of lines) {
    // Deteksi awal soal baru: "1. ...", "Soal 1: ...", "Pertanyaan: ..."
    const numberedMatch = line.match(/^(?:soal\s*\d+\s*[:.)-]|\d+\s*[.)])\s*(.+)$/i);
    const labeledQMatch = line.match(/^(?:pertanyaan|soal)\s*[:]\s*(.+)$/i);

    if (numberedMatch || labeledQMatch) {
      flushCurrent();
      current = {
        subject: defaultSub,
        topic: "Materi Pokok",
        semester: "1",
        level: "Easy",
        question: (numberedMatch ? numberedMatch[1] : labeledQMatch![1]).trim(),
        answer: "",
        wrong: [],
        options: {},
        keywords: "",
        explanation: "",
      };
      continue;
    }

    if (!current) continue;

    let m: RegExpMatchArray | null;
    if ((m = line.match(/^(?:mata pelajaran|mapel)\s*[:]\s*(.+)$/i))) {
      current.subject = m[1].trim();
    } else if ((m = line.match(/^(?:materi|topik)\s*[:]\s*(.+)$/i))) {
      current.topic = m[1].trim();
    } else if ((m = line.match(/^(?:semester|sem)\s*[:]\s*(.+)$/i))) {
      current.semester = m[1].trim();
    } else if ((m = line.match(/^(?:tingkat|level)\s*[:]\s*(.+)$/i))) {
      current.level = m[1].trim();
    } else if ((m = line.match(/^(?:jawaban benar|kunci jawaban|jawaban|kunci)\s*[:]\s*(.+)$/i))) {
      current.answer = m[1].trim();
    } else if ((m = line.match(/^(?:pengecoh(?:\s*\d+)?|pilihan salah|salah(?:\s*\d+)?)\s*[:]\s*(.+)$/i))) {
      current.wrong.push(
        ...m[1]
          .split(/[,;|]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      );
    } else if ((m = line.match(/^(?:kata kunci(?:\s*argumentasi)?)\s*[:]\s*(.+)$/i))) {
      current.keywords = m[1].trim();
    } else if ((m = line.match(/^(?:pembahasan|penjelasan)\s*[:]\s*(.+)$/i))) {
      current.explanation = m[1].trim();
    } else if ((m = line.match(/^([A-D])\s*[.)]\s*(.+)$/i))) {
      current.options[m[1].toUpperCase()] = m[2].trim();
    } else if (!current.answer && !current.explanation) {
      // Baris lanjutan dari teks pertanyaan
      current.question += " " + line;
    }
  }

  flushCurrent();

  return {
    valid,
    skipped,
    error:
      valid.length === 0
        ? "Tidak ditemukan soal yang valid di file Word. Gunakan format Tabel Template atau format bernomor (1. ... Jawaban: ...)."
        : undefined,
  };
}

/**
 * Parse file Word (.docx): cek tabel HTML terlebih dahulu, jika tidak ada gunakan teks terstruktur
 */
export async function parseWordQuestions(
  file: File,
  teacherSubject: string,
  isSubjectRestricted: boolean,
  subjects: SubjectItem[]
): Promise<ParseImportResult> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".doc") && !lower.endsWith(".docx")) {
    return {
      valid: [],
      skipped: 0,
      error: "Format .doc (Word lama) belum didukung langsung. Silakan Save As menjadi .docx di Microsoft Word terlebih dahulu.",
    };
  }

  const buffer = await file.arrayBuffer();
  const mammothInput: any =
    typeof Buffer !== "undefined"
      ? { arrayBuffer: buffer, buffer: Buffer.from(buffer) }
      : { arrayBuffer: buffer };

  // 1. Coba parse tabel dari HTML hasil mammoth
  const htmlResult = await mammoth.convertToHtml(mammothInput);
  if (typeof DOMParser !== "undefined" && htmlResult.value.includes("<table")) {
    const doc = new DOMParser().parseFromString(htmlResult.value, "text/html");
    const tables = Array.from(doc.querySelectorAll("table"));
    const validFromTables: QuestionInsert[] = [];
    let skippedFromTables = 0;

    for (const table of tables) {
      const trs = Array.from(table.querySelectorAll("tr"));
      if (trs.length < 2) continue;

      const headers = Array.from(trs[0].querySelectorAll("th, td")).map((cell) =>
        (cell.textContent || "").trim()
      );

      for (let i = 1; i < trs.length; i++) {
        const cells = Array.from(trs[i].querySelectorAll("th, td")).map((cell) =>
          (cell.textContent || "").trim()
        );
        const rowObj: Record<string, string> = {};
        headers.forEach((h, idx) => {
          if (h) rowObj[h] = cells[idx] || "";
        });

        const q = rowObjectToQuestion(rowObj, teacherSubject, isSubjectRestricted, subjects);
        if (q) validFromTables.push(q);
        else if (cells.some((c) => c.length > 0)) skippedFromTables++;
      }
    }

    if (validFromTables.length > 0) {
      return { valid: validFromTables, skipped: skippedFromTables };
    }
  }

  // 2. Jika tidak ada tabel soal, parse teks terstruktur
  const textResult = await mammoth.extractRawText(mammothInput);
  return parseStructuredWordText(textResult.value, teacherSubject, isSubjectRestricted, subjects);
}

/**
 * Unduh Template Excel (.xlsx)
 */
export function downloadExcelTemplate(defaultSub: string): void {
  const rows = [
    {
      "Mata Pelajaran": defaultSub,
      Semester: "1",
      "Materi / Topik": "Materi Pokok 1",
      "Tingkat (Easy/Medium/HOTS)": "Easy",
      Pertanyaan: "Contoh: Hewan pemakan tumbuhan disebut...",
      "Jawaban Benar": "Herbivora",
      "Pengecoh 1": "Karnivora",
      "Pengecoh 2": "Omnivora",
      "Pengecoh 3": "Insektivora",
      "Kata Kunci Argumentasi": "tumbuhan, rumput, herbivora",
      Pembahasan: "Herbivora adalah hewan yang memakan tumbuhan sebagai makanan utamanya.",
    },
    {
      "Mata Pelajaran": defaultSub,
      Semester: "2",
      "Materi / Topik": "Materi Pokok 2",
      "Tingkat (Easy/Medium/HOTS)": "Medium",
      Pertanyaan: "Contoh: Organ tumbuhan tempat berlangsungnya fotosintesis adalah...",
      "Jawaban Benar": "Daun",
      "Pengecoh 1": "Akar",
      "Pengecoh 2": "Batang",
      "Pengecoh 3": "Bunga",
      "Kata Kunci Argumentasi": "klorofil, daun, matahari",
      Pembahasan: "Daun memiliki klorofil untuk menyerap cahaya matahari pada fotosintesis.",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 24 },
    { wch: 20 },
    { wch: 24 },
    { wch: 42 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 28 },
    { wch: 42 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template Soal");
  XLSX.writeFile(wb, "Template_Upload_Soal_SD_Match.xlsx");
}

/**
 * Unduh Template Word (.docx) dengan format Tabel siap edit
 */
export async function downloadWordTemplate(defaultSub: string): Promise<void> {
  const headers = [
    "Mata Pelajaran",
    "Semester",
    "Tingkat",
    "Pertanyaan",
    "Jawaban Benar",
    "Pengecoh 1",
    "Pengecoh 2",
    "Pengecoh 3",
    "Kata Kunci",
    "Pembahasan",
  ];

  const sampleRows = [
    [
      defaultSub,
      "1",
      "Easy",
      "Contoh: Hewan pemakan tumbuhan disebut...",
      "Herbivora",
      "Karnivora",
      "Omnivora",
      "Insektivora",
      "tumbuhan, rumput, herbivora",
      "Herbivora adalah hewan pemakan tumbuhan.",
    ],
    [
      defaultSub,
      "2",
      "Medium",
      "Contoh: Organ tumbuhan tempat fotosintesis adalah...",
      "Daun",
      "Akar",
      "Batang",
      "Bunga",
      "klorofil, daun, matahari",
      "Daun memiliki klorofil untuk fotosintesis.",
    ],
  ];

  const makeRow = (cells: string[], bold = false) =>
    new TableRow({
      children: cells.map(
        (text) =>
          new TableCell({
            width: { size: Math.floor(100 / cells.length), type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [new TextRun({ text, bold, size: 18 })],
              }),
            ],
          })
      ),
    });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: "Template Upload Soal SD Match - MIN 1 Ende",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Isi tabel di bawah ini (atau gunakan format bernomor 1. Pertanyaan / Jawaban: ... / Pengecoh: ... / Kata Kunci: ... / Pembahasan: ...), lalu unggah kembali file .docx ini.",
                size: 20,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [makeRow(headers, true), ...sampleRows.map((r) => makeRow(r, false))],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Template_Upload_Soal_SD_Match.docx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
