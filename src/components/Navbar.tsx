"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { HelpCircle, GraduationCap, Gamepad2, School, Sun, Moon } from "lucide-react";

interface NavbarProps {
  currentView: "student" | "teacher";
  onSwitchView: (view: "student" | "teacher") => void;
  onOpenRules: () => void;
}

export function Navbar({ currentView, onSwitchView, onOpenRules }: NavbarProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Inisialisasi tema dari localStorage atau preferensi sistem
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Identitas Sekolah */}
        <div 
          onClick={() => onSwitchView("student")}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="relative w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 p-1 border-2 border-emerald-500/30 dark:border-emerald-500/40 shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden">
            <Image
              src="/logo/min1ende.webp"
              alt="Logo MIN 1 Ende"
              width={36}
              height={36}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg sm:text-xl tracking-tight bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                SD Match
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                MI
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300">
              <School className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>MIN 1 Ende • Flores, NTT</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Tombol Ganti Tema Light / Dark */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
            title={isDarkMode ? "Ganti ke Mode Terang (Light Mode)" : "Ganti ke Mode Gelap (Dark Mode)"}
            aria-label="Toggle theme"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400 fill-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 fill-slate-700" />
            )}
          </button>

          {/* Tombol Petunjuk Permainan */}
          <button
            type="button"
            onClick={onOpenRules}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:scale-95 border border-slate-200 dark:border-slate-700"
          >
            <HelpCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Panduan</span>
          </button>

          {/* Toggle Role Guru / Murid */}
          {currentView === "student" ? (
            <button
              type="button"
              onClick={() => onSwitchView("teacher")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-all active:scale-95 shadow-sm"
            >
              <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Area Guru</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSwitchView("student")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-500/20 transition-all active:scale-95"
            >
              <Gamepad2 className="w-4 h-4" />
              <span>Arena Murid</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
