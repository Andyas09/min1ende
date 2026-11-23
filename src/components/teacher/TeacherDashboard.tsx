"use client";

import React, { useState } from "react";
import Image from "next/image";
import { QuestionBankTab } from "./QuestionBankTab";
import { AssessmentReportTab } from "./AssessmentReportTab";
import { SessionSettingsTab } from "./SessionSettingsTab";
import { SubjectManagementTab } from "./SubjectManagementTab";
import { BookOpen, FileSpreadsheet, Settings, LogOut, School, Layers } from "lucide-react";

interface TeacherDashboardProps {
  teacherName: string;
  onLogout: () => void;
  roomCode: string;
  onUpdateRoomCode: (code: string) => void;
  timerLimits: {
    Easy: number;
    Medium: number;
    HOTS: number;
  };
  onUpdateTimerLimits: (limits: { Easy: number; Medium: number; HOTS: number }) => void;
}

export function TeacherDashboard({
  teacherName,
  onLogout,
  roomCode,
  onUpdateRoomCode,
  timerLimits,
  onUpdateTimerLimits,
}: TeacherDashboardProps) {
  const [activeTab, setActiveTab] = useState<"questions" | "subjects" | "reports" | "settings">("questions");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-50 pb-16 transition-colors">
      {/* Top Banner Dashboard Guru */}
      <div className="bg-white dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 p-1.5 border-2 border-emerald-500/30 dark:border-emerald-500/40 shadow-sm flex items-center justify-center shrink-0">
                <Image
                  src="/logo/min1ende.webp"
                  alt="Logo MIN 1 Ende"
                  width={40}
                  height={40}
                  className="object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-slate-50">
                    Dashboard Guru & Fasilitator
                  </h1>
                  <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-950 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                    Aktif
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mt-0.5">
                  <School className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{teacherName} • MIN 1 Ende (Nusa Tenggara Timur)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black text-slate-800 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mt-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("questions")}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-black border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "questions"
                  ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-t-xl"
                  : "border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Bank Soal (CRUD)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("subjects")}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-black border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "subjects"
                  ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-t-xl"
                  : "border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Mata Pelajaran & Materi</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("reports")}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-black border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "reports"
                  ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-t-xl"
                  : "border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Assessment Report (Rekap & Audio)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-black border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "settings"
                  ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-t-xl"
                  : "border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Pengaturan Sesi & Timer</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "questions" && <QuestionBankTab />}
        {activeTab === "subjects" && <SubjectManagementTab />}
        {activeTab === "reports" && <AssessmentReportTab />}
        {activeTab === "settings" && (
          <SessionSettingsTab
            roomCode={roomCode}
            onUpdateRoomCode={onUpdateRoomCode}
            timerLimits={timerLimits}
            onUpdateTimerLimits={onUpdateTimerLimits}
          />
        )}
      </main>
    </div>
  );
}
