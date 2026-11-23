"use client";

import React, { useState, useRef, useEffect } from "react";
import { GameCard, ArgumentSubmission } from "@/types";
import { VoiceRecorderService, VoiceRecordingResult } from "@/lib/voice-recorder";
import { AudioPlayer } from "@/components/AudioPlayer";
import { formatTime } from "@/lib/utils";
import {
  Mic,
  Square,
  RotateCcw,
  FileText,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface ArgumentModalProps {
  isOpen: boolean;
  questionCard: GameCard;
  answerCard: GameCard;
  onVerify: (submission: ArgumentSubmission) => void;
  onCancel: () => void;
}

export function ArgumentModal({
  isOpen,
  questionCard,
  answerCard,
  onVerify,
  onCancel,
}: ArgumentModalProps) {
  const [activeTab, setActiveTab] = useState<"voice" | "text">("voice");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingResult, setRecordingResult] = useState<VoiceRecordingResult | null>(null);
  const [argumentText, setArgumentText] = useState("");
  const [recorderError, setRecorderError] = useState<string | null>(null);

  const recorderRef = useRef<VoiceRecorderService | null>(null);

  useEffect(() => {
    recorderRef.current = new VoiceRecorderService();
    return () => {
      if (recorderRef.current) {
        recorderRef.current.cancelRecording();
      }
    };
  }, []);

  if (!isOpen) return null;

  // Start Voice Recording
  const handleStartRecording = async () => {
    setRecorderError(null);
    setRecordingResult(null);
    setRecordingSeconds(0);

    try {
      if (!recorderRef.current) {
        recorderRef.current = new VoiceRecorderService();
      }
      await recorderRef.current.startRecording((seconds) => {
        setRecordingSeconds(seconds);
      });
      setIsRecording(true);
    } catch (err: any) {
      console.error("Gagal merekam suara:", err);
      setRecorderError(err.message || "Gagal mengakses mikrofon. Anda dapat menggunakan opsi Input Teks.");
    }
  };

  // Stop Voice Recording
  const handleStopRecording = async () => {
    if (!recorderRef.current) return;
    try {
      const result = await recorderRef.current.stopRecording();
      setRecordingResult(result);
      setIsRecording(false);
    } catch (err: any) {
      console.error("Gagal menghentikan rekaman:", err);
      setIsRecording(false);
    }
  };

  // Reset Voice Recording
  const handleResetRecording = () => {
    setRecordingResult(null);
    setRecordingSeconds(0);
    setRecorderError(null);
  };

  // Syarat tombol verifikasi aktif
  const canVerify =
    (activeTab === "voice" && recordingResult !== null) ||
    (activeTab === "text" && argumentText.trim().length >= 3);

  const handleVerifyClick = () => {
    if (!canVerify) return;

    if (activeTab === "voice" && recordingResult) {
      onVerify({
        type: "voice",
        audioBlob: recordingResult.blob,
        audioDurationSeconds: recordingResult.durationSeconds,
        audioUrl: recordingResult.url,
        text: `Voice Note (${recordingResult.durationSeconds} detik)`,
      });
    } else {
      onVerify({
        type: "text",
        text: argumentText.trim(),
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-slate-300 dark:border-slate-700 p-5 sm:p-7">
        {/* Header Modal */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-amber-100 text-amber-950 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Tahap Berargumentasi (Wajib Sebelum Verifikasi)</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-slate-50">
            Jelaskan Alasan Pilihanmu!
          </h3>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
            Mengapa kamu memasangkan kedua kartu ini? Sampaikan argumenmu untuk mendapatkan nilai kualitas argumentasi (bobot 30%).
          </p>
        </div>

        {/* Pasangan Kartu yang Dipilih */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/80 border-2 border-blue-300 dark:border-blue-700 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 block mb-1">
              Kartu Soal
            </span>
            <p className="text-xs sm:text-sm font-black text-slate-950 dark:text-slate-50 leading-snug">
              {questionCard.content}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border-2 border-emerald-300 dark:border-emerald-700 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300 block mb-1">
              Kartu Jawaban Pilihanmu
            </span>
            <p className="text-xs sm:text-sm font-black text-slate-950 dark:text-slate-50 leading-snug">
              {answerCard.content}
            </p>
          </div>
        </div>

        {/* Tab Pilihan Opsi Argumentasi: Suara vs Teks */}
        <div className="flex rounded-2xl bg-slate-200/90 dark:bg-slate-800 p-1 mb-4 border border-slate-300 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab("voice")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === "voice"
                ? "bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 shadow-md border border-slate-200 dark:border-slate-700"
                : "text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
            }`}
          >
            <Mic className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Voice Note (Rekaman Suara)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("text")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === "text"
                ? "bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 shadow-md border border-slate-200 dark:border-slate-700"
                : "text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Input Teks</span>
          </button>
        </div>

        {/* KONTEN TAB 1: VOICE NOTE (REKAMAN SUARA) */}
        {activeTab === "voice" && (
          <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 text-center mb-5">
            {recorderError && (
              <div className="mb-3 p-3 rounded-xl bg-rose-100 dark:bg-rose-950 border-2 border-rose-300 dark:border-rose-800 text-xs font-bold text-rose-950 dark:text-rose-200 flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{recorderError}</span>
              </div>
            )}

            {!isRecording && !recordingResult && (
              <div className="py-4">
                <button
                  type="button"
                  onClick={handleStartRecording}
                  className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-gradient-to-tr from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white shadow-xl shadow-rose-500/30 flex items-center justify-center group active:scale-95 transition-all cursor-pointer"
                  title="Mulai Rekam Suara"
                >
                  <Mic className="w-8 h-8 sm:w-10 sm:h-10 group-hover:scale-110 transition-transform" />
                </button>
                <div className="mt-3">
                  <span className="text-sm font-black text-slate-950 dark:text-slate-50 block">
                    Tekan untuk Mulai Merekam
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Bicaralah dengan jelas dan santai menjelaskan alasanmu.
                  </span>
                </div>
              </div>
            )}

            {isRecording && (
              <div className="py-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-rose-600 text-white shadow-xl shadow-rose-600/40 flex items-center justify-center animate-record-pulse">
                  <Mic className="w-8 h-8 sm:w-10 sm:h-10 animate-bounce" />
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-mono font-black text-rose-600 dark:text-rose-400 tabular-nums">
                    {formatTime(recordingSeconds)}
                  </div>
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100 block mt-0.5">
                    Sedang Merekam Suara...
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs text-white bg-slate-900 hover:bg-black shadow-md active:scale-95 transition-transform cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-current text-rose-400" />
                  <span>Selesai & Kunci Rekaman</span>
                </button>
              </div>
            )}

            {recordingResult && !isRecording && (
              <div className="py-2 text-left space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Rekaman Suara Siap ({recordingResult.durationSeconds} detik)</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleResetRecording}
                    className="inline-flex items-center gap-1 text-xs font-black text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Rekam Ulang</span>
                  </button>
                </div>

                <AudioPlayer
                  src={recordingResult.url}
                  title="Preview Voice Note Kamu"
                />
              </div>
            )}
          </div>
        )}

        {/* KONTEN TAB 2: INPUT TEKS */}
        {activeTab === "text" && (
          <div className="mb-5">
            <label className="block text-xs font-black text-slate-950 dark:text-slate-50 mb-1.5">
              Ketikkan Alasan / Nalar Kritis Pilihanmu:
            </label>
            <textarea
              rows={4}
              value={argumentText}
              onChange={(e) => setArgumentText(e.target.value)}
              placeholder="Contoh: Saya memilih pasangan ini karena hewan herbivora secara biologis memiliki susunan gigi pemamah biak untuk mencerna tumbuhan..."
              className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-950 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
              <span>Minimal 3 karakter untuk memverifikasi.</span>
              <span>{argumentText.length} karakter</span>
            </div>
          </div>
        )}

        {/* Tombol Aksi */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t-2 border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-2xl font-black text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
          >
            Batal Pilih
          </button>

          <button
            type="button"
            disabled={!canVerify}
            onClick={handleVerifyClick}
            className={`flex-1 sm:flex-initial px-6 py-3 rounded-2xl font-black text-xs text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
              canVerify
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/25 active:scale-95 cursor-pointer"
                : "bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-60 shadow-none"
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Verifikasi Jawaban</span>
          </button>
        </div>
      </div>
    </div>
  );
}
