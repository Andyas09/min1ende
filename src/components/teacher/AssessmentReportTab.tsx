"use client";

import React, { useState, useEffect } from "react";
import { GameSession, SessionAnswer } from "@/types";
import { getGameSessionsReport, updateArgumentScore, deleteGameSession } from "@/lib/supabase";
import { formatScore, formatTime, formatDateIndonesia } from "@/lib/utils";
import { AudioPlayer } from "@/components/AudioPlayer";
import {
  FileSpreadsheet,
  Users,
  Award,
  Clock,
  Mic,
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  Trash2,
  Sparkles,
} from "lucide-react";

export function AssessmentReportTab() {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSession, setSelectedSession] = useState<GameSession | null>(null);

  // Score override state in review modal
  const [scoringAnswerId, setScoringAnswerId] = useState<string | null>(null);
  const [tempScore, setTempScore] = useState<number>(85);
  const [teacherComment, setTeacherComment] = useState<string>("");
  const [savingScore, setSavingScore] = useState(false);

  const loadSessions = async () => {
    setLoading(true);
    const data = await getGameSessionsReport();
    setSessions(data);
    setLoading(false);
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // Filtered Sessions
  const filteredSessions = sessions.filter(
    (s) =>
      s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_class.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.room_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistics calculation
  const totalCompleted = sessions.filter((s) => s.status !== "in_progress").length;
  const avgFinalScore =
    sessions.length > 0
      ? sessions.reduce((acc, s) => acc + Number(s.final_score), 0) / sessions.length
      : 0;
  const avgPairingScore =
    sessions.length > 0
      ? sessions.reduce((acc, s) => acc + Number(s.score_pairing), 0) / sessions.length
      : 0;
  const avgArgumentScore =
    sessions.length > 0
      ? sessions.reduce((acc, s) => acc + Number(s.score_argumentation), 0) / sessions.length
      : 0;

  // Handler for Updating Argument Score by Teacher
  const handleSaveArgumentScore = async (answer: SessionAnswer) => {
    setSavingScore(true);
    const ok = await updateArgumentScore(answer.id, tempScore, teacherComment);
    if (ok) {
      if (selectedSession && selectedSession.answers) {
        const updatedAnswers = selectedSession.answers.map((a) =>
          a.id === answer.id ? { ...a, argument_score: tempScore, teacher_comment: teacherComment } : a
        );
        const newAvgArg =
          updatedAnswers.reduce((sum, a) => sum + Number(a.argument_score), 0) / updatedAnswers.length;
        const newFinal =
          Number(selectedSession.score_pairing) * 0.4 +
          newAvgArg * 0.3 +
          Number(selectedSession.score_activity) * 0.2 +
          Number(selectedSession.score_time) * 0.1;

        const updatedSession: GameSession = {
          ...selectedSession,
          answers: updatedAnswers,
          score_argumentation: Math.round(newAvgArg * 10) / 10,
          final_score: Math.round(newFinal * 10) / 10,
        };

        setSelectedSession(updatedSession);
        setSessions((prev) => prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)));
      }
      setScoringAnswerId(null);
    }
    setSavingScore(false);
  };

  // Handler Hapus Sesi
  const handleDeleteSession = async (sessionId: string) => {
    if (confirm("Hapus rekaman sesi murid ini dari laporan?")) {
      const ok = await deleteGameSession(sessionId);
      if (ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (selectedSession?.id === sessionId) {
          setSelectedSession(null);
        }
      }
    }
  };

  // EXPORT TO CSV / EXCEL
  const handleExportCSV = () => {
    if (sessions.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }

    const headers = [
      "No",
      "Nama Murid",
      "Kelas",
      "Tingkat Kognitif",
      "Kode Room",
      "Total Soal",
      "Pasangan Tepat",
      "Waktu Selesai (detik)",
      "Ketepatan Pasangan (40%)",
      "Kualitas Argumentasi (30%)",
      "Aktivitas (20%)",
      "Ketepatan Waktu (10%)",
      "Nilai Akhir (100%)",
      "Status",
      "Tanggal Main",
    ];

    const rows = filteredSessions.map((s, index) => [
      index + 1,
      `"${s.student_name.replace(/"/g, '""')}"`,
      `"${s.student_class}"`,
      s.difficulty_level,
      s.room_code,
      s.total_questions,
      s.correct_answers,
      s.time_spent_seconds,
      formatScore(s.score_pairing),
      formatScore(s.score_argumentation),
      formatScore(s.score_activity),
      formatScore(s.score_time),
      formatScore(s.final_score),
      s.status,
      formatDateIndonesia(s.created_at),
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Rekap_Nilai_SD_Match_MIN1_Ende_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-xs font-black mb-1">
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Siswa Selesai</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-slate-50">
            {totalCompleted}
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-xs font-black mb-1">
            <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Rata-rata Nilai</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {formatScore(avgFinalScore)}
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-xs font-black mb-1">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Rata-rata Argumen</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
            {formatScore(avgArgumentScore)}
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-xs font-black mb-1">
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
            <span>Rata-rata Pasangan</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
            {formatScore(avgPairingScore)}
          </div>
        </div>
      </div>

      {/* Action Bar (Search & Export CSV) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500 dark:text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari murid, kelas, atau kode room..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-950 dark:text-slate-50 focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm text-emerald-950 dark:text-emerald-100 bg-emerald-100 dark:bg-emerald-900/80 border-2 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200 dark:hover:bg-emerald-800 active:scale-95 transition-all shadow-sm cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Ekspor Rekap CSV / Excel</span>
        </button>
      </div>

      {/* Assessment Table */}
      <div className="overflow-x-auto rounded-3xl border-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left text-xs sm:text-sm text-slate-800 dark:text-slate-200">
          <thead className="bg-slate-100 dark:bg-slate-800 font-black text-slate-950 dark:text-slate-50 uppercase tracking-wider border-b-2 border-slate-300 dark:border-slate-700">
            <tr>
              <th className="py-4 px-4">Murid & Kelas</th>
              <th className="py-4 px-3">Level Bloom</th>
              <th className="py-4 px-3 text-center">Pasangan (40%)</th>
              <th className="py-4 px-3 text-center">Argumen (30%)</th>
              <th className="py-4 px-3 text-center">Aktivitas (20%)</th>
              <th className="py-4 px-3 text-center">Waktu (10%)</th>
              <th className="py-4 px-4 text-center">Nilai Akhir</th>
              <th className="py-4 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800 font-semibold">
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 font-black text-slate-600 dark:text-slate-400">
                  Memuat data asesmen murid...
                </td>
              </tr>
            ) : filteredSessions.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 font-bold text-slate-600 dark:text-slate-400">
                  Belum ada riwayat permainan murid yang tersimpan.
                </td>
              </tr>
            ) : (
              filteredSessions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                  <td className="py-4 px-4 font-black text-slate-950 dark:text-slate-50">
                    <div className="flex items-center gap-1.5">
                      <span>{s.player_mode === "group" ? "👥" : "👤"}</span>
                      <span>{s.student_name}</span>
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-300 font-bold mt-0.5">
                      {s.student_class} • {s.room_code}
                      {s.subject && s.subject !== "ALL" && ` • ${s.subject}`}
                    </div>
                    {s.group_members && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal truncate max-w-xs">
                        Anggota: {s.group_members}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-3">
                    <span className="px-2.5 py-1 rounded-full font-black text-xs bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700">
                      {s.difficulty_level}
                    </span>
                  </td>
                  <td className="py-4 px-3 text-center font-black text-blue-700 dark:text-blue-300">
                    {formatScore(s.score_pairing)}
                  </td>
                  <td className="py-4 px-3 text-center font-black text-amber-700 dark:text-amber-300">
                    {formatScore(s.score_argumentation)}
                  </td>
                  <td className="py-4 px-3 text-center font-black text-purple-700 dark:text-purple-300">
                    {formatScore(s.score_activity)}
                  </td>
                  <td className="py-4 px-3 text-center font-black text-slate-800 dark:text-slate-200">
                    {formatScore(s.score_time)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-block px-3.5 py-1 rounded-xl text-xs sm:text-sm font-black bg-emerald-100 text-emerald-950 dark:bg-emerald-900/80 dark:text-emerald-100 border border-emerald-300 dark:border-emerald-700">
                      {formatScore(s.final_score)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedSession(s)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm active:scale-95 transition-transform cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Evaluasi</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSession(s.id)}
                        className="p-1.5 rounded-xl text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                        title="Hapus Rekaman Sesi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* DETAIL ASSESSMENT & VOICE NOTE REVIEW MODAL */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-slate-300 dark:border-slate-700 p-6 sm:p-8">
            <button
              type="button"
              onClick={() => setSelectedSession(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Dialog */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-950 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 mb-2">
                Asesmen Individual Murid
              </div>
              <h3 className="text-2xl font-black text-slate-950 dark:text-slate-50">
                {selectedSession.student_name}
              </h3>
              <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                Kelas: {selectedSession.student_class} • Level: {selectedSession.difficulty_level} • Sesi: {selectedSession.room_code}
              </p>
            </div>

            {/* Ringkasan Skor 4 Komponen */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 mb-6">
              <div className="text-center">
                <span className="text-[11px] text-slate-800 dark:text-slate-200 font-black block">Ketepatan (40%)</span>
                <span className="text-base sm:text-lg font-black text-blue-700 dark:text-blue-400">
                  {formatScore(selectedSession.score_pairing)}
                </span>
              </div>
              <div className="text-center">
                <span className="text-[11px] text-slate-800 dark:text-slate-200 font-black block">Argumentasi (30%)</span>
                <span className="text-base sm:text-lg font-black text-amber-700 dark:text-amber-400">
                  {formatScore(selectedSession.score_argumentation)}
                </span>
              </div>
              <div className="text-center">
                <span className="text-[11px] text-slate-800 dark:text-slate-200 font-black block">Aktivitas (20%)</span>
                <span className="text-base sm:text-lg font-black text-purple-700 dark:text-purple-400">
                  {formatScore(selectedSession.score_activity)}
                </span>
              </div>
              <div className="text-center">
                <span className="text-[11px] text-slate-800 dark:text-slate-200 font-black block">Waktu (10%)</span>
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                  {formatScore(selectedSession.score_time)}
                </span>
              </div>
            </div>

            {/* List Detail Kartu & Argumentasi */}
            <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3">
              Daftar Pasangan Kartu & Rekaman Argumentasi:
            </h4>

            <div className="space-y-4">
              {(!selectedSession.answers || selectedSession.answers.length === 0) ? (
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-center text-xs font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  Detail rekaman kartu pada sesi ini tidak tersedia.
                </div>
              ) : (
                selectedSession.answers.map((ans, idx) => (
                  <div
                    key={ans.id}
                    className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-black text-slate-950 dark:text-slate-50">
                        Pasangan Kartu #{idx + 1}
                      </span>
                      {ans.is_correct ? (
                        <span className="flex items-center gap-1 font-black text-emerald-700 dark:text-emerald-400 text-xs">
                          <CheckCircle2 className="w-4 h-4" /> Pasangan Tepat
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-black text-rose-600 dark:text-rose-400 text-xs">
                          <XCircle className="w-4 h-4" /> Salah
                        </span>
                      )}
                    </div>

                    {/* Soal & Jawaban */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/70 border-2 border-blue-200 dark:border-blue-800">
                        <span className="text-[10px] font-black text-blue-950 dark:text-blue-300 block">Soal:</span>
                        <p className="font-bold text-slate-950 dark:text-slate-50 text-xs sm:text-sm mt-0.5">
                          {ans.question?.question_text || "Teks soal"}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border-2 border-emerald-200 dark:border-emerald-800">
                        <span className="text-[10px] font-black text-emerald-950 dark:text-emerald-300 block">Jawaban Murid:</span>
                        <p className="font-bold text-emerald-950 dark:text-emerald-200 text-xs sm:text-sm mt-0.5">
                          {ans.user_answer_text}
                        </p>
                      </div>
                    </div>

                    {/* Argumentasi (Voice Note / Teks) */}
                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-200 dark:border-amber-900">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                          {ans.argument_type === "voice" ? (
                            <>
                              <Mic className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              <span>Rekaman Suara Murid (Voice Note)</span>
                            </>
                          ) : (
                            <>
                              <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              <span>Argumentasi Teks Murid</span>
                            </>
                          )}
                        </span>
                        <span className="text-xs font-black text-amber-900 dark:text-amber-200">
                          Skor: {ans.argument_score}/100
                        </span>
                      </div>

                      {ans.argument_type === "voice" && ans.argument_audio_url ? (
                        <AudioPlayer
                          src={ans.argument_audio_url}
                          title={`Voice Note Murid (${selectedSession.student_name})`}
                        />
                      ) : (
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                          &quot;{ans.argument_text || "Tidak ada rekaman teks"}&quot;
                        </p>
                      )}
                    </div>

                    {/* Form Revisi Nilai Guru */}
                    {scoringAnswerId === ans.id ? (
                      <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 space-y-2.5">
                        <div className="flex items-center gap-3">
                          <label className="text-xs font-black text-slate-950 dark:text-slate-50">
                            Revisi Nilai Argumen (0 - 100):
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={tempScore}
                            onChange={(e) => setTempScore(Number(e.target.value))}
                            className="w-20 px-2 py-1 rounded-xl text-center font-black text-xs sm:text-sm bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 text-slate-950 dark:text-slate-50"
                          />
                        </div>
                        <input
                          type="text"
                          value={teacherComment}
                          onChange={(e) => setTeacherComment(e.target.value)}
                          placeholder="Catatan / Umpan balik untuk murid..."
                          className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 text-slate-950 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setScoringAnswerId(null)}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveArgumentScore(ans)}
                            disabled={savingScore}
                            className="px-4 py-1.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                          >
                            {savingScore ? "Menyimpan..." : "Simpan Nilai"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 italic">
                          {ans.teacher_comment
                            ? `Catatan Guru: "${ans.teacher_comment}"`
                            : "Belum ada catatan koreksi khusus"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setScoringAnswerId(ans.id);
                            setTempScore(ans.argument_score || 80);
                            setTeacherComment(ans.teacher_comment || "");
                          }}
                          className="text-xs font-black text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          Sesuaikan Nilai Argumentasi
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="px-6 py-2.5 rounded-2xl font-black text-xs sm:text-sm text-white bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-700 cursor-pointer"
              >
                Tutup Asesmen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
