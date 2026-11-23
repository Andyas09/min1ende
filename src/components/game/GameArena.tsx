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
} from "lucide-react";
import { motion } from "framer-motion";

interface GameArenaProps {
  student: StudentRegistration;
  session: GameSession;
  timeLimitSeconds: number;
  onGameFinished: (session: GameSession, breakdown: ScoreBreakdown) => void;
  onExitGame: () => void;
}

export function GameArena({
  student,
  session,
  timeLimitSeconds,
  onGameFinished,
  onExitGame,
}: GameArenaProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionCards, setQuestionCards] = useState<GameCard[]>([]);
  const [answerCards, setAnswerCards] = useState<GameCard[]>([]);

  const [selectedQuestionCard, setSelectedQuestionCard] = useState<GameCard | null>(null);
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
  const timeSpentRef = useRef(0);
  const questionsRef = useRef<Question[]>([]);
  const sessionRef = useRef(session);

  sessionRef.current = session;
  correctAnswersRef.current = correctAnswersCount;
  timeSpentRef.current = timeSpent;
  questionsRef.current = questions;

  const isUnlimited = timeLimitSeconds <= 0;

  // Inisialisasi Kartu (Membaca soal dan mengacak kartu)
  useEffect(() => {
    async function loadCards() {
      setLoadingArena(true);

      const fetchedQuestions = await getFilteredQuestions({
        difficulty: student.difficultyLevel,
        subject: student.subject,
        topic: student.topic,
      });

      const pairsCount = student.cardPairsCount || 6;
      const selected = fetchedQuestions.slice(0, pairsCount);
      setQuestions(selected);
      questionsRef.current = selected;

      // Kartu Soal
      const qCards: GameCard[] = selected.map((q, idx) => ({
        id: `qcard_${q.id}_${idx}`,
        questionId: q.id,
        type: "question",
        content: q.question_text,
        imageUrl: q.question_image_url,
        isSelected: false,
        isMatched: false,
        isLocked: false,
      }));

      // Kartu Jawaban
      const aCards: GameCard[] = selected.map((q, idx) => ({
        id: `acard_${q.id}_${idx}`,
        questionId: q.id,
        type: "answer",
        content: q.answer_text,
        imageUrl: q.answer_image_url,
        isSelected: false,
        isMatched: false,
        isLocked: false,
      }));

      // Shuffle acak
      const shuffle = <T,>(arr: T[]): T[] => {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
      };

      setQuestionCards(shuffle(qCards));
      setAnswerCards(shuffle(aCards));
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

      // 2. Kualitas Argumentasi: 30% (default nilai awal sistem 85 jika ada jawaban benar)
      const argumentScore = correctCount > 0 ? 85 : 70;

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

  // Buka Modal Argumentasi jika kedua kartu dipilih
  useEffect(() => {
    if (selectedQuestionCard && selectedAnswerCard) {
      setIsArgumentModalOpen(true);
    }
  }, [selectedQuestionCard, selectedAnswerCard]);

  // Handle Klik Kartu
  const handleCardClick = (card: GameCard) => {
    if (card.isMatched || isArgumentModalOpen || currentFeedback) return;

    playCardClick();

    if (card.type === "question") {
      if (selectedQuestionCard?.id === card.id) {
        setSelectedQuestionCard(null);
      } else {
        setSelectedQuestionCard(card);
      }
    } else {
      if (selectedAnswerCard?.id === card.id) {
        setSelectedAnswerCard(null);
      } else {
        setSelectedAnswerCard(card);
      }
    }
  };

  // Handle Verifikasi Argumentasi
  const handleVerifyArgument = async (submission: ArgumentSubmission) => {
    if (!selectedQuestionCard || !selectedAnswerCard || !session) return;

    setIsArgumentModalOpen(false);

    // 1. Cek kecocokan kunci jawaban
    const isCorrect = selectedQuestionCard.questionId === selectedAnswerCard.questionId;
    const currentQ = questions.find((q) => q.id === selectedQuestionCard.questionId);

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

    const provisionalArgScore = isCorrect ? (submission.type === "voice" ? 85 : 80) : 70;

    // 3. Simpan jawaban ke session_answers Supabase
    await saveSessionAnswer({
      session_id: session.id,
      question_id: selectedQuestionCard.questionId,
      user_answer_text: selectedAnswerCard.content,
      is_correct: isCorrect,
      argument_type: submission.type,
      argument_text: submission.text || null,
      argument_audio_url: finalAudioUrl || null,
      argument_score: provisionalArgScore,
    });

    let newMatchedCount = matchedPairsCount;
    let newCorrectCount = correctAnswersCount;

    // 4. Update status kartu di papan jika benar
    if (isCorrect) {
      newMatchedCount = matchedPairsCount + 1;
      newCorrectCount = correctAnswersCount + 1;

      setQuestionCards((prev) =>
        prev.map((c) => (c.id === selectedQuestionCard.id ? { ...c, isMatched: true } : c))
      );
      setAnswerCards((prev) =>
        prev.map((c) => (c.id === selectedAnswerCard.id ? { ...c, isMatched: true } : c))
      );
      setMatchedPairsCount(newMatchedCount);
      setCorrectAnswersCount(newCorrectCount);
    }

    // 5. Cek apakah ini pasangan terakhir yang menyelesaikan permainan
    const isGameOver = isCorrect && newMatchedCount >= questions.length;

    // 6. Tampilkan Feedback Modal
    setCurrentFeedback({
      isCorrect,
      questionText: selectedQuestionCard.content,
      chosenAnswerText: selectedAnswerCard.content,
      correctAnswerText: currentQ?.answer_text || "",
      explanation: currentQ?.explanation || "Penjelasan materi penguatan.",
      argumentType: submission.type,
      argumentContent: submission.text || "Voice Note",
      audioUrl: finalAudioUrl,
      isGameOver,
    });

    // Reset pilihan kartu aktif
    setSelectedQuestionCard(null);
    setSelectedAnswerCard(null);
  };

  // Lanjut setelah menutup modal feedback
  const handleNextAfterFeedback = () => {
    const isOver = currentFeedback?.isGameOver;
    setCurrentFeedback(null);

    if (isOver) {
      finishGame(correctAnswersRef.current, timeSpentRef.current);
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
          Mengacak kartu soal dan kartu jawaban
        </p>
      </div>
    );
  }

  const isTimeCritical = timeLeft <= 30;

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6 animate-fade-in">
      {/* Top Game Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-black text-slate-950 dark:text-slate-50 text-base sm:text-lg flex items-center gap-1.5">
              {student.playerMode === "group" ? (
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
              Pasangan
            </span>
            <span className="text-xs sm:text-sm font-black text-slate-950 dark:text-slate-50">
              {matchedPairsCount} / {questions.length} Selesai
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

      {/* Arena Grid: 2 Kolom (Kartu Soal & Kartu Jawaban) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* KOLOM 1: KARTU SOAL (WARNA BIRU) */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600 shadow-sm" />
              <span>1. Pilih Kartu Soal</span>
            </h3>
            <span className="text-xs font-black text-blue-900 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/70 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
              {questionCards.filter((c) => !c.isMatched).length} Tersisa
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {questionCards.map((card) => {
              const isSelected = selectedQuestionCard?.id === card.id;

              return (
                <motion.div
                  key={card.id}
                  whileHover={!card.isMatched ? { scale: 1.02 } : {}}
                  whileTap={!card.isMatched ? { scale: 0.98 } : {}}
                  onClick={() => handleCardClick(card)}
                  className={`relative p-5 rounded-3xl border-2 cursor-pointer transition-all min-h-[145px] flex flex-col justify-between select-none ${
                    card.isMatched
                      ? "bg-slate-100 dark:bg-slate-850/50 border-slate-300 dark:border-slate-800 opacity-40 cursor-default"
                      : isSelected
                      ? "bg-blue-600 text-white border-blue-700 shadow-xl shadow-blue-600/30 scale-[1.02]"
                      : "bg-blue-50/90 dark:bg-slate-900 border-blue-200 dark:border-blue-900 hover:border-blue-400 dark:hover:border-blue-700 shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wide px-2.5 py-0.5 rounded-full ${
                        isSelected
                          ? "bg-blue-500 text-white"
                          : "bg-blue-200/80 text-blue-950 dark:bg-blue-950 dark:text-blue-200 border border-blue-300 dark:border-blue-800"
                      }`}
                    >
                      Soal
                    </span>
                    {card.isMatched && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  </div>

                  {/* Gambar Soal (Jika Tersedia) */}
                  {card.imageUrl && (
                    <div className="relative w-full h-24 mb-2 rounded-xl overflow-hidden border border-blue-200 dark:border-blue-800 bg-white/50">
                      <Image
                        src={card.imageUrl}
                        alt="Ilustrasi Soal"
                        fill
                        className="object-contain p-1"
                        unoptimized
                      />
                    </div>
                  )}

                  <p
                    className={`text-xs sm:text-sm font-black leading-snug line-clamp-4 ${
                      isSelected ? "text-white" : "text-slate-950 dark:text-slate-50"
                    }`}
                  >
                    {card.content}
                  </p>

                  <div className="mt-2 text-right">
                    <span
                      className={`text-[10px] font-extrabold ${
                        isSelected
                          ? "text-blue-100"
                          : card.isMatched
                          ? "text-slate-400"
                          : "text-blue-800 dark:text-blue-300"
                      }`}
                    >
                      {card.isMatched
                        ? "Tercocokkan"
                        : isSelected
                        ? "Terpilih"
                        : "Ketuk untuk memilih"}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* KOLOM 2: KARTU JAWABAN (WARNA HIJAU/EMERALD) */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-600 shadow-sm" />
              <span>2. Pilih Kartu Pasangan Kunci</span>
            </h3>
            <span className="text-xs font-black text-emerald-900 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              {answerCards.filter((c) => !c.isMatched).length} Tersisa
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {answerCards.map((card) => {
              const isSelected = selectedAnswerCard?.id === card.id;

              return (
                <motion.div
                  key={card.id}
                  whileHover={!card.isMatched ? { scale: 1.02 } : {}}
                  whileTap={!card.isMatched ? { scale: 0.98 } : {}}
                  onClick={() => handleCardClick(card)}
                  className={`relative p-5 rounded-3xl border-2 cursor-pointer transition-all min-h-[145px] flex flex-col justify-between select-none ${
                    card.isMatched
                      ? "bg-slate-100 dark:bg-slate-850/50 border-slate-300 dark:border-slate-800 opacity-40 cursor-default"
                      : isSelected
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-xl shadow-emerald-600/30 scale-[1.02]"
                      : "bg-emerald-50/90 dark:bg-slate-900 border-emerald-200 dark:border-emerald-900 hover:border-emerald-400 dark:hover:border-emerald-700 shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wide px-2.5 py-0.5 rounded-full ${
                        isSelected
                          ? "bg-emerald-500 text-white"
                          : "bg-emerald-200/80 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800"
                      }`}
                    >
                      Jawaban
                    </span>
                    {card.isMatched && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  </div>

                  {/* Gambar Jawaban (Jika Tersedia) */}
                  {card.imageUrl && (
                    <div className="relative w-full h-24 mb-2 rounded-xl overflow-hidden border border-emerald-200 dark:border-emerald-800 bg-white/50">
                      <Image
                        src={card.imageUrl}
                        alt="Ilustrasi Jawaban"
                        fill
                        className="object-contain p-1"
                        unoptimized
                      />
                    </div>
                  )}

                  <p
                    className={`text-xs sm:text-sm font-black leading-snug line-clamp-4 ${
                      isSelected ? "text-white" : "text-slate-950 dark:text-slate-50"
                    }`}
                  >
                    {card.content}
                  </p>

                  <div className="mt-2 text-right">
                    <span
                      className={`text-[10px] font-extrabold ${
                        isSelected
                          ? "text-emerald-100"
                          : card.isMatched
                          ? "text-slate-400"
                          : "text-emerald-800 dark:text-emerald-300"
                      }`}
                    >
                      {card.isMatched
                        ? "Tercocokkan"
                        : isSelected
                        ? "Terpilih"
                        : "Ketuk untuk mencocokkan"}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL ARGUMENTASI INTERAKTIF */}
      {isArgumentModalOpen && selectedQuestionCard && selectedAnswerCard && (
        <ArgumentModal
          isOpen={isArgumentModalOpen}
          questionCard={selectedQuestionCard}
          answerCard={selectedAnswerCard}
          onVerify={handleVerifyArgument}
          onCancel={() => {
            setIsArgumentModalOpen(false);
            setSelectedQuestionCard(null);
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
