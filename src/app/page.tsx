"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { RulesModal } from "@/components/RulesModal";
import { TeacherAuthModal } from "@/components/TeacherAuthModal";
import { TeacherDashboard } from "@/components/teacher/TeacherDashboard";
import { StudentRegistrationForm } from "@/components/game/StudentRegistration";
import { GameArena } from "@/components/game/GameArena";
import { GameResultScreen } from "@/components/game/GameResultScreen";
import { StudentRegistration, GameSession, ScoreBreakdown } from "@/types";
import { createGameSession, getFilteredQuestions, supabase, isSupabaseConfigured, clearBrowserDataCache } from "@/lib/supabase";

export default function HomePage() {
  // Navigation / View State
  const [currentView, setCurrentView] = useState<"student" | "teacher">("student");
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isTeacherAuthOpen, setIsTeacherAuthOpen] = useState(false);

  // Teacher State: Disimpan di localStorage agar saat halaman di-reload tidak keluar otomatis
  const [teacherInfo, setTeacherInfo] = useState<{ email: string; name: string; role?: "admin" | "guru"; subject?: string } | null>(null);
  const [roomCode, setRoomCode] = useState("MIN1-ENDE");
  const [timerLimits, setTimerLimits] = useState({
    Easy: 300,
    Medium: 360,
    HOTS: 420,
  });

  // Bersihkan cache data browser dan pulihkan sesi login guru saat browser di-refresh
  React.useEffect(() => {
    // 1. Bersihkan seluruh sisa cache data lama di browser
    clearBrowserDataCache();

    // 2. Pulihkan sesi login guru jika ada dan verifikasi ke Supabase
    try {
      const savedTeacher = localStorage.getItem("sd_match_teacher_session");
      if (savedTeacher) {
        const parsed = JSON.parse(savedTeacher);
        if (parsed?.email) {
          if (parsed.email.toLowerCase() === "admin@min1ende.com") {
            parsed.role = "admin";
          }
          setTeacherInfo(parsed);
          const lastView = localStorage.getItem("sd_match_last_view");
          if (lastView === "teacher") {
            setCurrentView("teacher");
          }

          // Verifikasi dan sinkronkan data profil terbaru langsung dari Supabase
          if (isSupabaseConfigured()) {
            (supabase.from("profiles") as any)
              .select("full_name, role, subject")
              .ilike("email", parsed.email)
              .single()
              .then(({ data }: any) => {
                if (data) {
                  setTeacherInfo((prev) =>
                    prev
                      ? {
                          ...prev,
                          name: data.full_name || prev.name,
                          role: parsed.email.toLowerCase() === "admin@min1ende.com" ? "admin" : data.role || prev.role,
                          subject: data.subject || prev.subject,
                        }
                      : null
                  );
                }
              })
              .catch((err: any) => console.warn("Sinkronisasi profile:", err));
          }
        }
      }
    } catch (e) {
      console.warn("Gagal membaca sesi guru:", e);
    }
  }, []);

  // Student Game State: 'register' | 'playing' | 'result'
  const [gameState, setGameState] = useState<"register" | "playing" | "result">("register");
  const [currentStudent, setCurrentStudent] = useState<StudentRegistration | null>(null);
  const [activeSession, setActiveSession] = useState<GameSession | null>(null);
  const [completedSession, setCompletedSession] = useState<GameSession | null>(null);
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdown | null>(null);
  const [startingGame, setStartingGame] = useState(false);

  // Switch between Student and Teacher Area
  const handleSwitchView = (view: "student" | "teacher") => {
    if (view === "teacher") {
      if (!teacherInfo) {
        setIsTeacherAuthOpen(true);
      } else {
        setCurrentView("teacher");
        localStorage.setItem("sd_match_last_view", "teacher");
      }
    } else {
      setCurrentView("student");
      localStorage.setItem("sd_match_last_view", "student");
    }
  };

  const handleTeacherLoginSuccess = (info: { email: string; name: string; role?: "admin" | "guru"; subject?: string }) => {
    // Pastikan admin@min1ende.com memiliki role admin
    const finalInfo = {
      ...info,
      role: info.email.toLowerCase() === "admin@min1ende.com" ? ("admin" as const) : info.role || ("guru" as const),
      subject: info.subject || "Semua Mapel",
    };
    setTeacherInfo(finalInfo);
    setCurrentView("teacher");
    try {
      localStorage.setItem("sd_match_teacher_session", JSON.stringify(finalInfo));
      localStorage.setItem("sd_match_last_view", "teacher");
    } catch (e) {
      console.warn("Gagal menyimpan sesi guru ke localStorage:", e);
    }
  };

  const handleTeacherLogout = async () => {
    setTeacherInfo(null);
    setCurrentView("student");
    try {
      localStorage.removeItem("sd_match_teacher_session");
      localStorage.setItem("sd_match_last_view", "student");
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn("Gagal logout:", e);
    }
  };

  // Student Game Flow: Tepat 1 kali pembuatan sesi saat tombol Mulai ditekan
  const handleStartGame = async (student: StudentRegistration) => {
    if (startingGame) return;
    setStartingGame(true);

    try {
      const qList = await getFilteredQuestions({
        difficulty: student.difficultyLevel,
        subject: student.subject,
        topic: student.topic,
        semester: student.semester,
      });

      const targetPairs = student.cardPairsCount || 6;
      const totalQuestionsCount = Math.min(targetPairs, qList.length);

      const effectiveTime =
        student.timeLimitSeconds && student.timeLimitSeconds > 0
          ? student.timeLimitSeconds
          : timerLimits[student.difficultyLevel] || 300;

      const session = await createGameSession({
        student_name: student.studentName,
        student_class: student.studentClass,
        player_mode: student.playerMode,
        group_members: student.groupMembers,
        subject: student.subject,
        topic: student.topic,
        room_code: student.roomCode,
        difficulty_level: student.difficultyLevel,
        total_questions: totalQuestionsCount,
        time_limit_seconds: effectiveTime,
        status: "in_progress",
      });

      setCurrentStudent(student);
      setActiveSession(session);
      setGameState("playing");
    } catch (err) {
      console.error("Gagal memulai sesi game:", err);
      alert("Gagal memulai sesi game. Silakan coba kembali.");
    } finally {
      setStartingGame(false);
    }
  };

  const handleGameFinished = (session: GameSession, breakdown: ScoreBreakdown) => {
    setCompletedSession(session);
    setScoreBreakdown(breakdown);
    setGameState("result");
  };

  const handlePlayAgain = () => {
    setGameState("register");
    setActiveSession(null);
    setCompletedSession(null);
    setScoreBreakdown(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-50 transition-colors">
      {/* Global Navbar */}
      <Navbar
        currentView={currentView}
        onSwitchView={handleSwitchView}
        onOpenRules={() => setIsRulesOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 flex flex-col justify-center">
        {currentView === "teacher" && teacherInfo ? (
          <TeacherDashboard
            teacherName={teacherInfo.name}
            teacherEmail={teacherInfo.email}
            teacherRole={teacherInfo.role || (teacherInfo.email.toLowerCase() === "admin@min1ende.com" ? "admin" : "guru")}
            teacherSubject={teacherInfo.subject || "Semua Mapel"}
            onLogout={handleTeacherLogout}
            roomCode={roomCode}
            onUpdateRoomCode={setRoomCode}
            timerLimits={timerLimits}
            onUpdateTimerLimits={setTimerLimits}
          />
        ) : (
          <div className="w-full">
            {gameState === "register" && (
              <StudentRegistrationForm
                onStartGame={handleStartGame}
                defaultRoomCode={roomCode}
              />
            )}

            {gameState === "playing" && currentStudent && activeSession && (
              <GameArena
                student={currentStudent}
                session={activeSession}
                timeLimitSeconds={
                  currentStudent.timeLimitSeconds && currentStudent.timeLimitSeconds > 0
                    ? currentStudent.timeLimitSeconds
                    : currentStudent.timeLimitSeconds === 0
                    ? 0 // Unlimited / Bebas
                    : timerLimits[currentStudent.difficultyLevel] || 300
                }
                onGameFinished={handleGameFinished}
                onExitGame={handlePlayAgain}
              />
            )}

            {gameState === "result" && completedSession && scoreBreakdown && (
              <GameResultScreen
                session={completedSession}
                scoreBreakdown={scoreBreakdown}
                onPlayAgain={handlePlayAgain}
                onGoHome={handlePlayAgain}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="py-6 border-t-2 border-slate-200 dark:border-slate-800 text-center text-xs text-slate-700 dark:text-slate-300 flex flex-col items-center justify-center gap-2">
        <div className="relative w-8 h-8 rounded-xl bg-white dark:bg-slate-800 p-1 border border-emerald-500/30 flex items-center justify-center">
          <Image
            src="/logo/min1ende.webp"
            alt="Logo MIN 1 Ende"
            width={28}
            height={28}
            className="object-contain"
          />
        </div>
        <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
          Madrasah Ibtidaiyah Negeri (MIN) 1 Ende • Kabupaten Ende, Flores, Nusa Tenggara Timur
        </p>
      </footer>

      {/* Modals */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      <TeacherAuthModal
        isOpen={isTeacherAuthOpen}
        onClose={() => setIsTeacherAuthOpen(false)}
        onSuccess={handleTeacherLoginSuccess}
      />
    </div>
  );
}
