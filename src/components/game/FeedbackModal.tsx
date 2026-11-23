"use client";

import React, { useEffect } from "react";
import { VerificationFeedback } from "@/types";
import { playApplause, playZonk, triggerCelebrationConfetti } from "@/lib/audio";
import { CheckCircle2, XCircle, ArrowRight, BookOpen, Trophy } from "lucide-react";

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

          {!feedback.isCorrect && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase">Kunci Sebenarnya:</span>
              <p className="font-black text-emerald-800 dark:text-emerald-300 text-sm mt-0.5">
                {feedback.correctAnswerText}
              </p>
            </div>
          )}
        </div>

        {/* Penjelasan Edukatif / Pembahasan */}
        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border-2 border-blue-200 dark:border-blue-800 text-left mb-6">
          <div className="flex items-center gap-1.5 text-xs font-black text-blue-950 dark:text-blue-200 mb-1">
            <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Pembahasan Edukatif MIN 1 Ende:</span>
          </div>
          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
            {feedback.explanation}
          </p>
        </div>

        {/* Tombol Lanjut */}
        <button
          type="button"
          onClick={onNext}
          className="w-full py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <span>
            {feedback.isGameOver
              ? "Lihat Hasil Akhir & Peringkat"
              : feedback.isCorrect
              ? "Lanjut ke Pasangan Berikutnya"
              : "Coba Pasangkan Kembali"}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
