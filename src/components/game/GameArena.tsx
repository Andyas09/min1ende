"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  StudentRegistration,
  Question,
  GameCard,
  ArgumentSubmission,
  VerificationFeedback,
  GameSession,
  ScoreBreakdown,
} from "@/types";
import {
  getFilteredQuestions,
  updateGameSession,
  saveSessionAnswer,
  uploadArgumentAudio,
} from "@/lib/supabase";
import { generateQuestionChoices, evaluateArgument } from "@/lib/game-engine";
import { playCardClick, playTimerTick } from "@/lib/audio";
import { formatTime } from "@/lib/utils";
import { ArgumentModal } from "./ArgumentModal";
import { FeedbackModal } from "./FeedbackModal";
import {
  Clock,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  Users,
  User,
  ImageIcon,
  ArrowRight,
  BookOpen,
  Award,
  Layers,
} from "lucide-react";
import { motion } from "framer-motion";

interface GameArenaProps {
  student: StudentRegistration;
  session: GameSession;
  timeLimitSeconds: number;
  onGameFinished: (session: GameSession, breakdown: ScoreBreakdown) => void;
  onExitGame: () => void;
}

const OPTION_LABELS = ["A", "B", "C", "D"];

export function GameArena({
  student,
  session,
  timeLimitSeconds,
  onGameFinished,
  onExitGame,
}: GameArenaProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allQuestionsPool, setAllQuestionsPool] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [currentChoices, setCurrentChoices] = useState<GameCard[]>([]);

  const [selectedAnswerCard, setSelectedAnswerCard] = useState<GameCard | null>(null);

  const [timeLeft, setTimeLeft] = useState<number>(timeLimitSeconds);
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);

  const [matchedPairsCount, setMatchedPairsCount] = useState<number>(0);
  const [correctAnswersCount, setCorrectAnswersCount] = useState<number>(0);

  // Modals state
  const [isArgumentModalOpen, setIsArgumentModalOpen] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<VerificationFeedback | null>(null);
  const [loadingArena, setLoadingArena] = useState(true);

  // Refs to avoid stale closures in timer & async events
  const isFinishedRef = useRef(false);
  const correctAnswersRef = useRef(0);
  const argumentScoresRef = useRef<number[]>([]);
  const timeSpentRef = useRef(0);
  const questionsRef = useRef<Question[]>([]);
  const sessionRef = useRef(session);

  sessionRef.current = session;
  correctAnswersRef.current = correctAnswersCount;
  timeSpentRef.current = timeSpent;
  questionsRef.current = questions;

  const isUnlimited = timeLimitSeconds <= 0;

  // Inisialisasi Arena: Memuat soal dan menyiapkan 4 pilihan kartu per soal
  useEffect(() => {
    async function loadCards() {
      setLoadingArena(true);

      const [filtered, allPool] = await Promise.all([
        getFilteredQuestions({
          difficulty: student.difficultyLevel,
          subject: student.subject,
          topic: student.topic,
          semester: student.semester,
        }),
        getFilteredQuestions({
          subject: student.subject,
          topic: student.topic,
          semester: student.semester,
        }),
      ]);

      const pairsCount = student.cardPairsCount || 6;
      const selected = filtered.slice(0, pairsCount);
      setQuestions(selected);
      questionsRef.current = selected;
      setAllQuestionsPool(allPool);

      if (selected.length > 0) {
        setCurrentQuestionIndex(0);
        const choices = generateQuestionChoices(selected[0], allPool);
        setCurrentChoices(choices);
      }

      setLoadingArena(false);
    }

    loadCards();
  }, [student.difficultyLevel, student.subject, student.topic, student.cardPairsCount]);

  // Kalkulasi Skor Akhir 4 Pilar SD Match (40% + 30% + 20% + 10%)
  const finishGame = useCallback(
    async (correctCount: number, finalTimeSpent: number) => {
      if (isFinishedRef.current) return;
      isFinishedRef.current = true;
      setIsTimerRunning(false);

      const totalQ = questionsRef.current.length || 1;
      // 1. Ketepatan Pasangan: 40% (rasio benar terhadap total soal)
      const pairingRatio = Math.min(1, correctCount / totalQ);
      const pairingScore = Math.round(pairingRatio * 100);

      // 2. Kualitas Argumentasi: 30% (rata-rata skor pengecekan kata kunci argumentasi)
      const recordedScores = argumentScoresRef.current;
      const argumentScore =
        recordedScores.length > 0
          ? Math.round(recordedScores.reduce((a, b) => a + b, 0) / recordedScores.length)
          : correctCount > 0
          ? 85
          : 70;

      // 3. Aktivitas: 20% (keikutsertaan menyelesaikan soal & menyampaikan argumen)
      const activityScore = Math.round((correctCount / totalQ) * 100);

      // 4. Ketepatan Waktu: 10% (rasio efisiensi sisa waktu)
      const timeScore =
        timeLimitSeconds > 0
          ? Math.round(Math.max(0, (timeLimitSeconds - finalTimeSpent) / timeLimitSeconds) * 100)
          : 100;

      // Skor Akhir Total (100%)
      const finalScore = Math.round(
        pairingScore * 0.4 + argumentScore * 0.3 + activityScore * 0.2 + timeScore * 0.1
      );

      const breakdown: ScoreBreakdown = {
        scorePairing: pairingScore,
        scoreArgumentation: argumentScore,
        scoreActivity: activityScore,
        scoreTime: timeScore,
        finalScore,
        totalQuestions: totalQ,
        correctAnswers: correctCount,
        timeSpentSeconds: finalTimeSpent,
        timeLimitSeconds,
      };

      const updated = await updateGameSession(sessionRef.current.id, {
        correct_answers: correctCount,
        time_spent_seconds: finalTimeSpent,
        score_pairing: pairingScore,
        score_argumentation: argumentScore,
        score_activity: activityScore,
        score_time: timeScore,
        final_score: finalScore,
        status: "completed",
        completed_at: new Date().toISOString(),
      });

      onGameFinished(updated || sessionRef.current, breakdown);
    },
    [timeLimitSeconds, onGameFinished]
  );

  // Countdown Timer Interval
  useEffect(() => {
    if (!isTimerRunning || loadingArena) return;

    const interval = setInterval(() => {
      setTimeSpent((prev) => prev + 1);

      if (!isUnlimited) {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            return 0;
          }
          if (prev <= 11) {
            playTimerTick();
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, loadingArena, isUnlimited]);

  // Handle timeout saat timeLeft mencapai 0
  useEffect(() => {
    if (!isUnlimited && !loadingArena && timeLeft === 0 && !isFinishedRef.current) {
      alert("Waktu pengerjaan telah habis! Sistem akan menghitung skor akhirmu.");
      finishGame(correctAnswersRef.current, timeLimitSeconds);
    }
  }, [timeLeft, isUnlimited, loadingArena, timeLimitSeconds, finishGame]);

  const currentQ = questions[currentQuestionIndex];

  // Objek GameCard untuk kartu soal aktif
  const activeQuestionCard: GameCard = currentQ
    ? {
        id: `qcard_${currentQ.id}`,
        questionId: currentQ.id,
        type: "question",
        content: currentQ.question_text,
        imageUrl: currentQ.question_image_url || null,
        isSelected: true,
        isMatched: false,
        isLocked: false,
      }
    : {
        id: "empty",
        questionId: "empty",
        type: "question",
        content: "",
        isSelected: false,
        isMatched: false,
        isLocked: false,
      };

  // Handle Klik Kartu Pilihan Jawaban
  const handleAnswerCardClick = (card: GameCard) => {
    if (isArgumentModalOpen || currentFeedback) return;
    playCardClick();
    setSelectedAnswerCard(card);
    setIsArgumentModalOpen(true);
  };

  // Handle Verifikasi Argumentasi (Voice Note atau Teks)
  const handleVerifyArgument = async (submission: ArgumentSubmission) => {
    if (!selectedAnswerCard || !currentQ || !session) return;

    setIsArgumentModalOpen(false);

    // 1. Cek apakah kartu jawaban yang dipilih murid adalah kartu yang tepat (bukan distractor)
    const isCorrect =
      selectedAnswerCard.questionId === currentQ.id &&
      selectedAnswerCard.content.trim().toLowerCase() === currentQ.answer_text.trim().toLowerCase();

    // 2. Upload Audio jika jenis argumentasi adalah Voice Note
    let finalAudioUrl = submission.audioUrl;
    if (submission.type === "voice" && submission.audioBlob) {
      const uploadRes = await uploadArgumentAudio(
        submission.audioBlob,
        `${student.studentName.replace(/\s+/g, "_")}`
      );
      if (uploadRes.url) {
        finalAudioUrl = uploadRes.url;
      }
    }

    // 3. Evaluasi Kata Kunci Argumentasi
    const textToEvaluate =
      submission.type === "text" ? submission.text || "" : submission.transcript || "";

    let argumentValid: boolean | null = null;
    let matchedKeywords: string[] = [];
    if (textToEvaluate.trim().length > 0) {
      const evalResult = evaluateArgument(textToEvaluate, currentQ);
      argumentValid = evalResult.valid;
      matchedKeywords = evalResult.matched;
    }

    let provisionalArgScore = 80;
    if (isCorrect) {
      if (argumentValid === true) {
        provisionalArgScore = submission.type === "voice" ? 90 : 85;
      } else if (argumentValid === false) {
        // Tidak ada kata kunci yang sesuai -> argumentasi dianggap tidak sesuai
        provisionalArgScore = 40;
      } else {
        provisionalArgScore = 80;
      }
    } else {
      provisionalArgScore = argumentValid === false ? 30 : 55;
    }
    argumentScoresRef.current.push(provisionalArgScore);

    // 4. Simpan jawaban ke session_answers Supabase
    await saveSessionAnswer({
      session_id: session.id,
      question_id: currentQ.id,
      user_answer_text: selectedAnswerCard.content,
      is_correct: isCorrect,
      argument_type: submission.type,
      argument_text: submission.text || null,
      argument_audio_url: finalAudioUrl || null,
      argument_score: provisionalArgScore,
    });

    const newCorrectCount = isCorrect ? correctAnswersCount + 1 : correctAnswersCount;
    const newMatchedCount = matchedPairsCount + 1;

    setCorrectAnswersCount(newCorrectCount);
    setMatchedPairsCount(newMatchedCount);
    correctAnswersRef.current = newCorrectCount;

    // 5. Cek apakah ini soal terakhir
    const isGameOver = currentQuestionIndex >= questions.length - 1;

    // 6. Tampilkan Feedback Modal (jika salah, kunci dan pembahasan dirahasiakan)
    setCurrentFeedback({
      isCorrect,
      questionText: currentQ.question_text,
      chosenAnswerText: selectedAnswerCard.content,
      correctAnswerText: isCorrect ? currentQ.answer_text : "",
      explanation: isCorrect ? currentQ.explanation || "Penjelasan materi penguatan." : "",
      argumentType: submission.type,
      argumentContent: submission.text || "Voice Note",
      audioUrl: finalAudioUrl,
      isGameOver,
      argumentValid,
      matchedKeywords,
    });
  };

  // Lanjut setelah menutup modal feedback
  const handleNextAfterFeedback = () => {
    const isOver = currentFeedback?.isGameOver;
    setCurrentFeedback(null);

    if (isOver) {
      finishGame(correctAnswersRef.current, timeSpentRef.current);
    } else {
      // Pindah ke soal berikutnya
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setSelectedAnswerCard(null);

      // Siapkan 4 pilihan kartu untuk soal berikutnya
      if (questions[nextIndex]) {
        const nextChoices = generateQuestionChoices(questions[nextIndex], allQuestionsPool);
        setCurrentChoices(nextChoices);
      }
    }
  };

  if (loadingArena) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
        <Sparkles className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
        <h3 className="text-base font-black text-slate-950 dark:text-slate-50">
          Menyiapkan Arena Kartu Make A Match...
        </h3>
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
          Menyiapkan pilihan kartu jawaban untuk soal aktif
        </p>
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
        <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-2">
          Tidak ada soal yang tersedia
        </h3>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-4">
          Silakan kembali ke menu pendaftaran untuk memilih materi atau tingkat lain.
        </p>
        <button
          type="button"
          onClick={onExitGame}
          className="px-6 py-2.5 rounded-2xl bg-emerald-600 text-white font-black text-sm"
        >
          Kembali ke Pendaftaran
        </button>
      </div>
    );
  }

  const isTimeCritical = timeLeft <= 30;
  const progressPercent = Math.round(((currentQuestionIndex + 1) / questions.length) * 100);

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6 animate-fade-in">
      {/* Top Game Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm mb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-black text-slate-950 dark:text-slate-50 text-base sm:text-lg flex items-center gap-1.5">
              {student.playerMode === "group" || student.playerMode === "pair" ? (
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              )}
              <span>{student.studentName}</span>
            </span>
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-950 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
              {student.studentClass}
            </span>
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-950 dark:bg-blue-900/60 dark:text-blue-200 border border-blue-300 dark:border-blue-700">
              {student.difficultyLevel}
            </span>
            {student.subject && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {student.subject === "ALL" ? "Semua Mapel" : student.subject}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Kode Sesi: {student.roomCode}
            </span>
            {student.groupMembers && (
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-xs">
                • Anggota: {student.groupMembers}
              </span>
            )}
          </div>
        </div>

        {/* Progress & Countdown Timer */}
        <div className="flex items-center justify-between sm:justify-end gap-4">
          <div className="text-left sm:text-right">
            <span className="text-[11px] text-slate-700 dark:text-slate-300 uppercase font-black block">
              Progres Soal
            </span>
            <span className="text-xs sm:text-sm font-black text-slate-950 dark:text-slate-50">
              Soal {currentQuestionIndex + 1} dari {questions.length}
            </span>
          </div>

          {/* Timer Display */}
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border-2 transition-all ${
              isUnlimited
                ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-950 dark:text-slate-50 font-black"
                : isTimeCritical
                ? "bg-rose-100 dark:bg-rose-950/80 border-rose-400 text-rose-950 dark:text-rose-200 animate-pulse font-black"
                : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-950 dark:text-slate-50 font-black"
            }`}
          >
            <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-mono font-black text-base sm:text-lg tabular-nums">
              {isUnlimited ? `♾️ ${formatTime(timeSpent)}` : formatTime(timeLeft)}
            </span>
          </div>

          <button
            type="button"
            onClick={onExitGame}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
            title="Keluar Permainan"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar Indikator Soal */}
      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden mb-6 shadow-inner">
        <div
          className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 h-full transition-all duration-500 ease-out rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Arena Grid: 2 Kolom (Sisi Kiri: Kartu Soal Aktif • Sisi Kanan: 4 Pilihan Kartu Jawaban) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* KOLOM 1 (5 Kolom): KARTU SOAL AKTIF (WARNA BIRU) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600 shadow-sm" />
              <span>1. Kartu Soal Aktif</span>
            </h3>
            <span className="text-xs font-black text-blue-950 dark:text-blue-200 bg-blue-100 dark:bg-blue-950/70 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">
              Soal #{currentQuestionIndex + 1}
            </span>
          </div>

          {/* Kartu Soal Utama */}
          <div className="relative p-6 sm:p-7 rounded-3xl border-2 border-blue-300 dark:border-blue-800 bg-gradient-to-b from-blue-50/90 to-blue-100/60 dark:from-slate-900 dark:to-blue-950/50 shadow-md flex flex-col justify-between min-h-[320px]">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-blue-600 text-white shadow-sm">
                  Kartu Soal
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-black px-2.5 py-0.5 rounded-md bg-blue-200/80 dark:bg-blue-900/60 text-blue-950 dark:text-blue-200 border border-blue-300 dark:border-blue-700">
                    {currentQ.difficulty_level}
                  </span>
                  {currentQ.topic && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-blue-200 dark:border-slate-700 truncate max-w-[150px]">
                      {currentQ.topic}
                    </span>
                  )}
                </div>
              </div>

              {/* Gambar Soal (Jika Tersedia) */}
              {currentQ.question_image_url && (
                <div className="relative w-full h-44 mb-4 rounded-2xl overflow-hidden border-2 border-blue-200 dark:border-blue-800 bg-white/80 dark:bg-slate-800 shadow-inner">
                  <Image
                    src={currentQ.question_image_url}
                    alt="Ilustrasi Soal"
                    fill
                    className="object-contain p-2"
                    unoptimized
                  />
                </div>
              )}

              {/* Teks Soal */}
              <p className="text-base sm:text-lg font-black text-slate-950 dark:text-slate-50 leading-relaxed">
                {currentQ.question_text}
              </p>
            </div>

            {/* Petunjuk Aksi */}
            <div className="mt-6 pt-4 border-t-2 border-blue-200/60 dark:border-blue-800/60 flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Pilih salah satu kartu jawaban di samping yang menurutmu pasangan tepat!</span>
            </div>
          </div>
        </div>

        {/* KOLOM 2 (7 Kolom): 4 PILIHAN KARTU JAWABAN (WARNA HIJAU/EMERALD) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-600 shadow-sm" />
              <span>2. Pilih Kartu Pasangan Kunci</span>
            </h3>
            <span className="text-xs font-black text-emerald-900 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              {currentChoices.length} Pilihan Jawaban
            </span>
          </div>

          {/* Grid 4 Kartu Jawaban (1 Kunci Tepat, 3 Pengecoh) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {currentChoices.map((card, idx) => {
              const isSelected = selectedAnswerCard?.id === card.id;
              const optionLabel = OPTION_LABELS[idx] || `${idx + 1}`;

              return (
                <motion.div
                  key={card.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAnswerCardClick(card)}
                  className={`group relative p-5 rounded-3xl border-2 cursor-pointer transition-all min-h-[145px] flex flex-col justify-between select-none ${
                    isSelected
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-xl shadow-emerald-600/30 scale-[1.02]"
                      : "bg-emerald-50/80 dark:bg-slate-900 border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-400 dark:hover:border-emerald-600 shadow-sm hover:shadow-md"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
                        isSelected
                          ? "bg-white text-emerald-700 shadow-sm"
                          : "bg-emerald-200/90 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800"
                      }`}
                    >
                      {optionLabel}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isSelected
                          ? "bg-emerald-500 text-white"
                          : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      }`}
                    >
                      Kartu Jawaban
                    </span>
                  </div>

                  {/* Teks Jawaban */}
                  <p
                    className={`text-sm sm:text-base font-black leading-snug my-2 ${
                      isSelected ? "text-white" : "text-slate-950 dark:text-slate-50"
                    }`}
                  >
                    {card.content}
                  </p>

                  <div className="mt-2 text-right">
                    <span
                      className={`text-[11px] font-black inline-flex items-center gap-1 ${
                        isSelected
                          ? "text-emerald-100"
                          : "text-emerald-800 dark:text-emerald-400 group-hover:text-emerald-900 dark:group-hover:text-emerald-300"
                      }`}
                    >
                      <span>Ketuk untuk memilih</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Banner Info Bantuan */}
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-200 dark:border-amber-800/60 text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              Perhatikan baik-baik: Ada kartu jawaban yang benar dan ada kartu pengecoh yang salah. Setelah memilih kartu, kamu akan diminta menyampaikan alasan/argumenmu!
            </span>
          </div>
        </div>
      </div>

      {/* MODAL ARGUMENTASI INTERAKTIF (Make A Match Digital) */}
      {isArgumentModalOpen && selectedAnswerCard && (
        <ArgumentModal
          isOpen={isArgumentModalOpen}
          questionCard={activeQuestionCard}
          answerCard={selectedAnswerCard}
          onVerify={handleVerifyArgument}
          onCancel={() => {
            setIsArgumentModalOpen(false);
            setSelectedAnswerCard(null);
          }}
        />
      )}

      {/* MODAL FEEDBACK MULTIMEDIA */}
      {currentFeedback && (
        <FeedbackModal
          feedback={currentFeedback}
          onNext={handleNextAfterFeedback}
        />
      )}
    </div>
  );
}
