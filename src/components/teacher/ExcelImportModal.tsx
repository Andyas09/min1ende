"use client";

import React, { useState } from "react";
import { Question, QuestionInsert, SubjectItem } from "@/types";
import { createQuestionsBulk } from "@/lib/supabase";
import {
  parseExcelQuestions,
  parseWordQuestions,
  downloadExcelTemplate,
  downloadWordTemplate,
} from "@/lib/question-import";
import {
  X,
  FileSpreadsheet,
  FileText,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: (created: Question[]) => void;
  teacherSubject?: string;
  isSubjectRestricted?: boolean;
  subjects: SubjectItem[];
}

export function ExcelImportModal({
  isOpen,
  onClose,
  onImported,
  teacherSubject = "Semua Mapel",
  isSubjectRestricted = false,
  subjects,
}: ExcelImportModalProps) {
  const [parsedRows, setParsedRows] = useState<QuestionInsert[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [fileName, setFileName] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const defaultSub = isSubjectRestricted
    ? teacherSubject
    : subjects[0]?.name || "IPAS / Sains";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setFileName(file.name);
    const lower = file.name.toLowerCase();

    try {
      const result =
        lower.endsWith(".docx") || lower.endsWith(".doc")
          ? await parseWordQuestions(file, teacherSubject, isSubjectRestricted, subjects)
          : await parseExcelQuestions(file, teacherSubject, isSubjectRestricted, subjects);

      setParsedRows(result.valid);
      setSkippedCount(result.skipped);
      if (result.error) {
        setErrorMsg(result.error);
      }
    } catch (err: any) {
      console.error("Gagal membaca file:", err);
      setErrorMsg("Gagal membaca file: " + (err.message || "Format tidak dikenali"));
      setParsedRows([]);
    }
  };

  const handleSaveAll = async () => {
    if (parsedRows.length === 0) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const created = await createQuestionsBulk(parsedRows);
      onImported(created);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan soal ke Supabase.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-slate-300 dark:border-slate-700 p-6 sm:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-950 dark:text-slate-50">
              Upload Soal & Jawaban (Excel / Word)
            </h3>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Impor banyak soal sekaligus dari file Excel (.xlsx / .xls / .csv) atau Microsoft Word (.docx).
            </p>
          </div>
        </div>

        {/* Langkah 1: Unduh Template */}
        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-200 dark:border-blue-800 space-y-3 mb-4">
          <div className="text-xs font-bold text-blue-950 dark:text-blue-200">
            <span className="font-black block text-sm mb-0.5">1. Unduh Template Excel atau Word (Opsional)</span>
            <span>
              Untuk Word (.docx), Anda dapat memakai <strong>Tabel Template</strong> atau mengetik format bernomor (contoh: <code>1. Pertanyaan</code>, <code>Jawaban: ...</code>, <code>Pengecoh: ...</code>, <code>Kata Kunci: ...</code>).
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadExcelTemplate(defaultSub)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-black text-xs text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Template Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => downloadWordTemplate(defaultSub)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-black text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-sm cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Template Word (.docx)</span>
            </button>
          </div>
        </div>

        {/* Langkah 2: Pilih File Excel atau Word */}
        <div className="mb-4">
          <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-2">
            2. Pilih File Excel (.xlsx / .xls / .csv) atau Word (.docx)
          </label>
          <label className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-emerald-400 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer transition-colors">
            <Upload className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mb-2" />
            <span className="text-sm font-black text-slate-900 dark:text-slate-100">
              {fileName
                ? `File terpilih: ${fileName}`
                : "Klik di sini untuk memilih file Excel (.xlsx / .csv) atau Word (.docx)"}
            </span>
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-1">
              {isSubjectRestricted
                ? `Seluruh soal otomatis tercatat untuk Mapel: ${teacherSubject}`
                : "Mendukung banyak mata pelajaran sekaligus"}
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.docx"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-100 dark:bg-rose-950 border-2 border-rose-300 dark:border-rose-800 text-xs font-bold text-rose-950 dark:text-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Preview Soal */}
        {parsedRows.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{parsedRows.length} soal siap diunggah ke Supabase</span>
              </span>
              {skippedCount > 0 && (
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                  ({skippedCount} baris dilewati karena kosong)
                </span>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto rounded-2xl border-2 border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                  <tr>
                    <th className="p-2.5 font-black">No</th>
                    <th className="p-2.5 font-black">Mapel & Tingkat</th>
                    <th className="p-2.5 font-black">Pertanyaan</th>
                    <th className="p-2.5 font-black">Jawaban Benar</th>
                    <th className="p-2.5 font-black">Kata Kunci</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {parsedRows.map((row, idx) => (
                    <tr key={idx} className="bg-white dark:bg-slate-900">
                      <td className="p-2.5 font-bold">{idx + 1}</td>
                      <td className="p-2.5">
                        <span className="font-black block">{row.subject}</span>
                        <span className="text-[10px] text-slate-500">{row.difficulty_level}</span>
                      </td>
                      <td className="p-2.5 font-semibold max-w-[220px] truncate">{row.question_text}</td>
                      <td className="p-2.5 font-black text-emerald-700 dark:text-emerald-400">
                        {row.answer_text}
                      </td>
                      <td className="p-2.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {row.keywords && row.keywords.length > 0 ? row.keywords.join(", ") : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t-2 border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={parsedRows.length === 0 || saving}
            onClick={handleSaveAll}
            className="px-6 py-2.5 rounded-2xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {saving ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan {parsedRows.length} Soal ke Database</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
