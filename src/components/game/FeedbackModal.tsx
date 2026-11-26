"use client";

import React, { useEffect } from "react";
import { VerificationFeedback } from "@/types";
import { playApplause, playZonk, triggerCelebrationConfetti } from "@/lib/audio";
import { CheckCircle2, XCircle, ArrowRight, BookOpen, Trophy, Lock, AlertTriangle } from "lucide-react";

interface FeedbackModalProps {
  feedback: VerificationFeedback;
  onNext: () => void;
}

export function FeedbackModal({ feedback, onNext }: FeedbackModalProps) {
  useEffect(() => {
    if (feedback.isCorrect) {
      playApplause();
      triggerCelebrationConfetti();
    } else {
      playZonk();
    }
  }, [feedback]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
      <div
        className={`relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 p-6 sm:p-8 text-center transition-all ${
          feedback.isCorrect
            ? "border-emerald-500 shadow-emerald-500/20"
            : "border-rose-500 shadow-rose-500/20 animate-shake"
        }`}
      >
        {/* Ikon Hasil Verifikasi */}
        {feedback.isCorrect ? (
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/90 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 shadow-lg shadow-emerald-500/30">
            {feedback.isGameOver ? (
              <Trophy className="w-12 h-12 text-amber-500 animate-bounce" />
            ) : (
              <CheckCircle2 className="w-12 h-12 animate-bounce" />
            )}
          </div>
        ) : (
          <div className="w-20 h-20 mx-auto rounded-full bg-rose-100 dark:bg-rose-950/90 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4 shadow-lg shadow-rose-500/30">
            <XCircle className="w-12 h-12" />
          </div>
        )}

        {/* Status Judul */}
        <div className="mb-4">
          <span
            className={`inline-block px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2 border ${
              feedback.isCorrect
                ? "bg-emerald-100 text-emerald-950 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700"
                : "bg-rose-100 text-rose-950 dark:bg-rose-900/60 dark:text-rose-200 border-rose-300 dark:border-rose-700"
            }`}
          >
            {feedback.isCorrect
              ? feedback.isGameOver
                ? "Semua Pasangan Tuntas!"
                : "Jawaban Tepat (SFX Tepuk Tangan!)"
              : "ZONK! Belum Cocok"}
          </span>
          <h3 className="text-2xl font-black text-slate-950 dark:text-slate-50">
            {feedback.isCorrect
              ? feedback.isGameOver
                ? "Luar Biasa, Semua Kartu Berhasil Dicocokkan!"
                : "Hebat, Pasanganmu Tepat!"
              : "Yah, Pasangan Belum Tepat!"}
          </h3>
        </div>

        {/* Ringkasan Pasangan */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 text-left space-y-2 mb-4 text-xs">
          <div>
            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">Soal:</span>
            <p className="font-bold text-slate-950 dark:text-slate-50 text-sm mt-0.5">{feedback.questionText}</p>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">Pilihanmu:</span>
            <p
              className={`font-black text-sm mt-0.5 ${
                feedback.isCorrect ? "text-emerald-700 dark:text-emerald-300" : "text-rose-600 dark:text-rose-400 line-through"
              }`}
            >
              {feedback.chosenAnswerText}
            </p>
          </div>
        </div>

        {/* Status Argumentasi (Hanya saat pasangan benar, atau saat teks diperiksa) */}
        {feedback.isCorrect && feedback.argumentValid !== undefined && (
          <div
            className={`p-3 rounded-2xl border-2 text-left mb-4 text-xs flex items-start gap-2 ${
              feedback.argumentValid === true
                ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200"
                : feedback.argumentValid === false
                ? "bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200"
                : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            }`}
          >
            {feedback.argumentValid === true ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-black block">
                {feedback.argumentValid === true
                  ? "Argumentasi Sesuai!"
                  : feedback.argumentValid === false
                  ? "Argumentasi Tidak Sesuai"
                  : "Rekaman Suara Tersimpan"}
              </span>
              <span className="text-[11px] font-semibold">
                {feedback.argumentValid === true
                  ? `Penjelasanmu memuat kata kunci: ${(feedback.matchedKeywords || []).join(", ")}`
                  : feedback.argumentValid === false
                  ? "Penjelasan tidak memuat salah satu kata kunci materi yang diharapkan."
                  : "Rekaman suaramu akan dinilai langsung oleh guru."}
              </span>
            </div>
          </div>
        )}

        {/* Penjelasan Edukatif / Rahasia Soal */}
        {feedback.isCorrect ? (
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border-2 border-blue-200 dark:border-blue-800 text-left mb-6">
            <div className="flex items-center gap-1.5 text-xs font-black text-blue-950 dark:text-blue-200 mb-1">
              <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Pembahasan Edukatif MIN 1 Ende:</span>
            </div>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
              {feedback.explanation}
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 text-left mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
              Kunci jawaban dan pembahasan tidak ditampilkan agar soal tetap bersifat rahasia.
            </p>
          </div>
        )}

        {/* Tombol Lanjut */}
        <button
          type="button"
          onClick={onNext}
          className="w-full py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <span>
            {feedback.isGameOver
              ? "Lihat Hasil Akhir & Peringkat"
              : "Lanjut ke Soal Berikutnya"}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
