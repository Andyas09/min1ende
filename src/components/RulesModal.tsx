"use client";

import React from "react";
import Image from "next/image";
import { X, BookOpen, Gamepad2, Brain, Mic, CheckCircle2, Award } from "lucide-react";

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RulesModal({ isOpen, onClose }: RulesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-slate-300 dark:border-slate-700 p-6 sm:p-8">
        {/* Tombol Tutup */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Modal */}
        <div className="mb-6 flex items-start gap-3.5">
          <div className="relative w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 p-1.5 border-2 border-emerald-500/30 dark:border-emerald-500/40 shadow-sm flex items-center justify-center shrink-0 mt-0.5">
            <Image
              src="/logo/min1ende.webp"
              alt="Logo MIN 1 Ende"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-950 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 mb-1.5">
              Panduan & Filosofi Pembelajaran
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-slate-50">
              Cara Bermain SD Match - MIN 1 Ende
            </h2>
            <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mt-1">
              Model Pembelajaran Kooperatif <strong>Make A Match</strong> yang mengintegrasikan 4 pilar kecakapan abad 21.
            </p>
          </div>
        </div>



        {/* Bobot Penilaian */}
        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 mb-6">
          <h3 className="text-sm font-black text-slate-950 dark:text-slate-50 mb-2 flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Formula Penilaian Otomatis (100% Total)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-700 shadow-sm border border-slate-300 dark:border-slate-600">
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">40%</div>
              <div className="text-slate-800 dark:text-slate-200 font-bold">Ketepatan Pasangan</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-700 shadow-sm border border-slate-300 dark:border-slate-600">
              <div className="text-xl font-black text-amber-600 dark:text-amber-400">30%</div>
              <div className="text-slate-800 dark:text-slate-200 font-bold">Kualitas Argumentasi</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-700 shadow-sm border border-slate-300 dark:border-slate-600">
              <div className="text-xl font-black text-blue-600 dark:text-blue-400">20%</div>
              <div className="text-slate-800 dark:text-slate-200 font-bold">Aktivitas & Lengkap</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-700 shadow-sm border border-slate-300 dark:border-slate-600">
              <div className="text-xl font-black text-purple-600 dark:text-purple-400">10%</div>
              <div className="text-slate-800 dark:text-slate-200 font-bold">Kecepatan Waktu</div>
            </div>
          </div>
        </div>

        {/* Langkah Praktis */}
        <div className="space-y-2.5 mb-6 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <span>Pilih 1 kartu soal (warna biru) dan 1 kartu jawaban (warna hijau).</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <span>Rekam suaramu atau ketik alasan mengapa kamu memilih pasangan kartu tersebut.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <span>Tekan <strong>Verifikasi</strong> untuk mendengarkan SFX tepuk tangan (jika benar) atau ZONK (jika salah).</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-600/20 active:scale-[0.99] transition-transform cursor-pointer"
        >
          Siap, Mengerti!
        </button>
      </div>
    </div>
  );
}
