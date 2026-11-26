import { Question, GameCard } from "@/types";

/**
 * Mengacak elemen array dengan algoritma Fisher-Yates
 */
export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Menghasilkan 2 hingga 4 kartu pilihan jawaban untuk 1 soal aktif:
 * - 1 Kartu Kunci Jawaban yang Benar
 * - Hingga 3 Kartu Jawaban Pengecoh (Distractors) yang Salah dari mapel/materi yang sama
 *
 * Prioritas distractor:
 * 1. Diambil dari input guru `currentQuestion.wrong_answers` jika ada.
 * 2. Diambil dari jawaban soal lain pada mapel & materi (topik) yang sama.
 * 3. Diambil dari jawaban soal lain pada mapel yang sama.
 * 4. Fallback minimal hanya jika belum ada pengecoh sama sekali (agar tetap ada >= 2 pilihan).
 */
export function generateQuestionChoices(
  currentQuestion: Question,
  allQuestions: Question[] = []
): GameCard[] {
  // 1. Kartu Kunci Jawaban Benar
  const correctCard: GameCard = {
    id: `ans_${currentQuestion.id}_correct`,
    questionId: currentQuestion.id,
    type: "answer",
    content: currentQuestion.answer_text,
    imageUrl: currentQuestion.answer_image_url || null,
    isSelected: false,
    isMatched: false,
    isLocked: false,
  };

  // 2. Kumpulkan pilihan jawaban salah
  const wrongOptions: string[] = [];
  const addWrong = (txt: string) => {
    const clean = (txt || "").trim();
    if (!clean) return;
    if (clean.toLowerCase() === currentQuestion.answer_text.trim().toLowerCase()) return;
    if (wrongOptions.some((existing) => existing.toLowerCase() === clean.toLowerCase())) return;
    wrongOptions.push(clean);
  };

  // A. Dari wrong_answers yang tersimpan pada soal ini
  if (Array.isArray(currentQuestion.wrong_answers)) {
    for (const w of currentQuestion.wrong_answers) {
      if (wrongOptions.length >= 3) break;
      addWrong(w);
    }
  }

  // B. Dari jawaban soal lain dalam mapel & topik yang sama
  if (wrongOptions.length < 3 && currentQuestion.topic) {
    const sameSubjectAndTopic = allQuestions.filter(
      (q) =>
        q.id !== currentQuestion.id &&
        subjectMatches(q.subject, currentQuestion.subject) &&
        q.topic &&
        q.topic.toLowerCase() === currentQuestion.topic!.toLowerCase()
    );
    for (const otherQ of shuffleArray(sameSubjectAndTopic)) {
      if (wrongOptions.length >= 3) break;
      addWrong(otherQ.answer_text);
    }
  }

  // C. Dari jawaban soal lain dalam mapel yang sama
  if (wrongOptions.length < 3) {
    const sameSubjectOthers = allQuestions.filter(
      (q) =>
        q.id !== currentQuestion.id &&
        subjectMatches(q.subject, currentQuestion.subject)
    );
    for (const otherQ of shuffleArray(sameSubjectOthers)) {
      if (wrongOptions.length >= 3) break;
      addWrong(otherQ.answer_text);
    }
  }

  // D. Fallback minimal hanya bila sama sekali belum ada pengecoh (misal baru ada 1 soal di mapel ini)
  if (wrongOptions.length === 0) {
    addWrong("Pilihan Belum Tepat");
  }

  // 3. Batasi maksimal 3 pengecoh dan buat GameCard
  const selectedWrong = wrongOptions.slice(0, 3);
  const wrongCards: GameCard[] = selectedWrong.map((text, idx) => ({
    id: `ans_${currentQuestion.id}_wrong_${idx}`,
    questionId: `wrong_${currentQuestion.id}_${idx}`,
    type: "answer",
    content: text,
    imageUrl: null,
    isSelected: false,
    isMatched: false,
    isLocked: false,
  }));

  // 4. Gabungkan 1 kartu benar + 3 kartu salah lalu acak posisinya
  return shuffleArray([correctCard, ...wrongCards]);
}

// ==============================================================================
// PENCOCOKAN MATA PELAJARAN (toleran: "PAI" = "Pendidikan Agama Islam")
// ==============================================================================

function normalizeText(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function acronym(s: string): string {
  return normalizeText(s)
    .split(" ")
    .filter((w) => w.length > 0 && !["dan", "and", "atau", "the"].includes(w))
    .map((w) => w[0])
    .join("");
}

/**
 * True jika dua nama mata pelajaran merujuk ke mapel yang sama.
 * Contoh cocok: "PAI" ~ "Pendidikan Agama Islam", "IPAS" ~ "IPAS / Sains", "Matematika" ~ "MATEMATIKA".
 */
export function subjectMatches(a?: string | null, b?: string | null): boolean {
  const na = normalizeText(a || "");
  const nb = normalizeText(b || "");
  if (!na || !nb) return false;
  if (na === nb) return true;
  const wordsA = na.split(" ");
  const wordsB = nb.split(" ");
  if (wordsA.includes(nb) || wordsB.includes(na)) return true;
  if (na.length >= 4 && nb.includes(na)) return true;
  if (nb.length >= 4 && na.includes(nb)) return true;
  const accA = acronym(a || "");
  const accB = acronym(b || "");
  if (accA.length >= 2 && (accA === nb || wordsB.includes(accA))) return true;
  if (accB.length >= 2 && (accB === na || wordsA.includes(accB))) return true;
  return false;
}

// ==============================================================================
// PENGECEKAN KATA KUNCI ARGUMENTASI
// ==============================================================================

const STOPWORDS = new Set([
  "yang", "dan", "atau", "dari", "untuk", "dengan", "pada", "dalam", "adalah", "ini", "itu",
  "karena", "sebagai", "oleh", "akan", "lebih", "juga", "tidak", "bisa", "dapat", "para",
  "secara", "maka", "agar", "saat", "ketika", "sebelum", "sesudah", "setelah", "hingga",
]);

/**
 * Kata kunci untuk sebuah soal: dari input guru (kolom `keywords`),
 * atau otomatis dari teks kunci jawaban bila guru belum mengisinya.
 */
export function getQuestionKeywords(q: Question): string[] {
  const fromTeacher = (q.keywords || []).map((k) => k.trim()).filter(Boolean);
  if (fromTeacher.length > 0) return fromTeacher;

  const answer = normalizeText(q.answer_text);
  const words = answer.split(" ").filter((w) => (w.length >= 4 || /\d/.test(w)) && !STOPWORDS.has(w));
  if (words.length > 0) return Array.from(new Set(words));
  return answer ? [answer] : [];
}

export interface ArgumentEvaluation {
  valid: boolean;
  matched: string[];
  keywords: string[];
}

/**
 * Argumentasi dianggap SESUAI jika memuat minimal satu kata kunci soal.
 */
export function evaluateArgument(argumentText: string, q: Question): ArgumentEvaluation {
  const keywords = getQuestionKeywords(q);
  const text = ` ${normalizeText(argumentText)} `;
  const matched = keywords.filter((k) => {
    const nk = normalizeText(k);
    return nk.length > 0 && text.includes(nk);
  });
  return { valid: matched.length > 0, matched, keywords };
}
