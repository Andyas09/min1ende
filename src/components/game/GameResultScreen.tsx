"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { GameSession, ScoreBreakdown } from "@/types";
import { formatScore, formatTime } from "@/lib/utils";
import { triggerVictoryConfetti } from "@/lib/audio";
import {
  Trophy,
  RotateCcw,
  Sparkles,
} from "lucide-react";

interface GameResultScreenProps {
  session: GameSession;
  scoreBreakdown: ScoreBreakdown;
  onPlayAgain: () => void;
  onGoHome: () => void;
}

export function GameResultScreen({
  session,
  scoreBreakdown,
  onPlayAgain,
  onGoHome,
}: GameResultScreenProps) {
  useEffect(() => {
    triggerVictoryConfetti();
  }, []);

  const getPredicate = (finalScore: number) => {
    if (finalScore >= 85) return { text: "Sangat Memuaskan (Mumtaz)", color: "text-emerald-800 dark:text-emerald-200", bg: "bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700" };
    if (finalScore >= 70) return { text: "Memuaskan (Jayyid Jiddan)", color: "text-blue-800 dark:text-blue-200", bg: "bg-blue-100 dark:bg-blue-900/60 border border-blue-300 dark:border-blue-700" };
    return { text: "Terus Belajar & Berlatih", color: "text-amber-800 dark:text-amber-200", bg: "bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700" };
  };

  const predicate = getPredicate(scoreBreakdown.finalScore);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      {/* Kartu Hasil Utama */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 shadow-2xl text-center mb-6">
        {/* Trophy & Logo Ikon */}
        <div className="relative w-20 h-20 mx-auto mb-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 text-white flex items-center justify-center shadow-xl shadow-amber-500/30 animate-bounce">
            <Trophy className="w-10 h-10" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white dark:bg-slate-800 p-0.5 border-2 border-emerald-500 shadow-md flex items-center justify-center">
            <Image
              src="/logo/min1ende.webp"
              alt="Logo MIN 1 Ende"
              width={24}
              height={24}
              className="object-contain"
            />
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-950 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Sesi Permainan Selesai</span>
        </div>

        <h1 className="text-3xl font-black text-slate-950 dark:text-slate-50">
          Selamat, {session.student_name}!
        </h1>
        <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mt-1">
          {session.student_class} • MIN 1 Ende • Level {session.difficulty_level}
        </p>

        {/* Skor Akhir Raksasa */}
        <div className="my-6 p-6 rounded-3xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1">
            Total Nilai Akhir
          </span>
          <div className="text-5xl sm:text-6xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatScore(scoreBreakdown.finalScore)}
          </div>
          <div className="mt-2.5">
            <span className={`inline-block px-3.5 py-1 rounded-full text-xs font-black ${predicate.bg} ${predicate.color}`}>
              {predicate.text}
            </span>
          </div>
        </div>

        {/* 4 Komponen Penilaian SD Match */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6 text-left">
          {/* 1. Ketepatan Pasangan */}
          <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border-2 border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between text-blue-950 dark:text-blue-200 mb-1">
              <span className="text-[10px] font-black uppercase">Pasangan</span>
              <span className="text-[10px] font-black">40%</span>
            </div>
            <div className="text-xl font-black text-blue-700 dark:text-blue-300">
              {formatScore(scoreBreakdown.scorePairing)}
            </div>
            <span className="text-[10px] text-blue-900 dark:text-blue-300 font-bold block mt-0.5">
              {scoreBreakdown.correctAnswers}/{scoreBreakdown.totalQuestions} tepat
            </span>
          </div>

          {/* 2. Kualitas Argumentasi */}
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/70 border-2 border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between text-amber-950 dark:text-amber-200 mb-1">
              <span className="text-[10px] font-black uppercase">Argumen</span>
              <span className="text-[10px] font-black">30%</span>
            </div>
            <div className="text-xl font-black text-amber-700 dark:text-amber-300">
              {formatScore(scoreBreakdown.scoreArgumentation)}
            </div>
            <span className="text-[10px] text-amber-900 dark:text-amber-300 font-bold block mt-0.5">
              Nilai awal sistem*
            </span>
          </div>

          {/* 3. Aktivitas */}
          <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/70 border-2 border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between text-purple-950 dark:text-purple-200 mb-1">
              <span className="text-[10px] font-black uppercase">Aktivitas</span>
              <span className="text-[10px] font-black">20%</span>
            </div>
            <div className="text-xl font-black text-purple-700 dark:text-purple-300">
              {formatScore(scoreBreakdown.scoreActivity)}
            </div>
            <span className="text-[10px] text-purple-900 dark:text-purple-300 font-bold block mt-0.5">
              Kelengkapan argumen
            </span>
          </div>

          {/* 4. Ketepatan Waktu */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border-2 border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-between text-emerald-950 dark:text-emerald-200 mb-1">
              <span className="text-[10px] font-black uppercase">Waktu</span>
              <span className="text-[10px] font-black">10%</span>
            </div>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-300">
              {formatScore(scoreBreakdown.scoreTime)}
            </div>
            <span className="text-[10px] text-emerald-900 dark:text-emerald-300 font-bold block mt-0.5">
              {formatTime(scoreBreakdown.timeSpentSeconds)} selesai
            </span>
          </div>
        </div>

        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 italic mb-6">
          *Catatan: Nilai kualitas argumentasi sementara diberikan oleh sistem dan dapat disesuaikan/divalidasi oleh Guru MIN 1 Ende setelah mendengarkan Voice Note rekaman suaramu.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onPlayAgain}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-black text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Main Lagi / Level Lain</span>
          </button>

          <button
            type="button"
            onClick={onGoHome}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-black text-xs text-slate-900 dark:text-slate-100 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 active:scale-95 transition-transform cursor-pointer"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    </div>
  );
}
