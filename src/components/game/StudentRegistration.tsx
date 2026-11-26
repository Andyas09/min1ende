"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { StudentRegistration, CognitiveLevel, SubjectItem, PlayerMode, ClassItem, Question } from "@/types";
import { BLOOM_LEVELS } from "@/lib/seed-data";
import { getSubjects, getClasses, DEFAULT_CLASSES, getQuestions } from "@/lib/supabase";
import { subjectMatches } from "@/lib/game-engine";
import {
  Sparkles,
  Gamepad2,
  User,
  Users,
  School,
  Hash,
  ArrowRight,
  Brain,
  Clock,
  Layers,
  CheckCircle2,
  BookOpen,
  Target,
  Zap,
  Trophy,
} from "lucide-react";

interface StudentRegistrationProps {
  onStartGame: (data: StudentRegistration) => void;
  defaultRoomCode?: string;
}

export function StudentRegistrationForm({
  onStartGame,
  defaultRoomCode = "MIN1-ENDE",
}: StudentRegistrationProps) {
  // 1. Mode Pemain (Individu, Pasangan, Kelompok)
  const [playerMode, setPlayerMode] = useState<PlayerMode>("individual");
  const [studentName, setStudentName] = useState("");
  const [pairName1, setPairName1] = useState("");
  const [pairName2, setPairName2] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState("");
  const [classes, setClasses] = useState<ClassItem[]>(DEFAULT_CLASSES);
  const [studentClass, setStudentClass] = useState("5A");
  const [roomCode, setRoomCode] = useState(defaultRoomCode);

  // 2. Mata Pelajaran & Materi & Bank Soal
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [allActiveQuestions, setAllActiveQuestions] = useState<Question[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
  const [selectedTopic, setSelectedTopic] = useState<string>("ALL");

  // 3. Jumlah Pasangan Kartu (Sesuai Referensi Gambar UI)
  const [cardPairsCount, setCardPairsCount] = useState<number>(6);

  // 4. Pengaturan Waktu
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number>(300); // Default 5 menit

  // 5. Tingkat Kognitif Bloom
  const [difficulty, setDifficulty] = useState<CognitiveLevel>("Easy");

  // Load Daftar Mata Pelajaran, Kelas & Soal Aktif dari Supabase
  useEffect(() => {
    async function loadInitialLists() {
      const [subData, classRes, qData] = await Promise.all([
        getSubjects(),
        getClasses(),
        getQuestions(),
      ]);
      setSubjects(subData);
      setAllActiveQuestions(qData);
      if (classRes.classes && classRes.classes.length > 0) {
        setClasses(classRes.classes);
        if (!classRes.classes.some((c) => c.name === studentClass)) {
          setStudentClass(classRes.classes[0].name);
        }
      }
    }
    loadInitialLists();
  }, []);

  // Pool soal sesuai mapel dan materi terpilih
  const topicPool = React.useMemo(() => {
    if (allActiveQuestions.length === 0) return [];
    const bySub =
      selectedSubject === "ALL"
        ? allActiveQuestions
        : allActiveQuestions.filter((q) => subjectMatches(q.subject, selectedSubject));
    if (bySub.length === 0) return [];
    const byTopic =
      selectedTopic === "ALL" || selectedTopic.startsWith("Semua Materi")
        ? bySub
        : bySub.filter(
            (q) =>
              !q.topic ||
              q.topic.toLowerCase().includes(selectedTopic.toLowerCase()) ||
              selectedTopic.toLowerCase().includes(q.topic.toLowerCase())
          );
    return byTopic.length > 0 ? byTopic : bySub;
  }, [allActiveQuestions, selectedSubject, selectedTopic]);

  // Jumlah soal per tingkat kesulitan pada mapel & materi terpilih
  const levelCounts = React.useMemo(
    () => ({
      Easy: topicPool.filter((q) => q.difficulty_level === "Easy").length,
      Medium: topicPool.filter((q) => q.difficulty_level === "Medium").length,
      HOTS: topicPool.filter((q) => q.difficulty_level === "HOTS").length,
    }),
    [topicPool]
  );

  // Otomatis pindah ke tingkat kesulitan yang tersedia jika level aktif kosong
  useEffect(() => {
    if (topicPool.length === 0) return;
    if (levelCounts[difficulty] === 0) {
      const firstAvailable = (["Easy", "Medium", "HOTS"] as CognitiveLevel[]).find(
        (lvl) => levelCounts[lvl] > 0
      );
      if (firstAvailable) {
        setDifficulty(firstAvailable);
      }
    }
  }, [topicPool, levelCounts, difficulty]);

  // Jumlah soal tersedia untuk level kesulitan terpilih
  const availableQuestionsCount =
    levelCounts[difficulty] > 0 ? levelCounts[difficulty] : topicPool.length;

  // Sesuaikan jumlah soal terpilih agar tidak melebihi soal yang tersedia
  useEffect(() => {
    if (availableQuestionsCount > 0 && cardPairsCount > availableQuestionsCount) {
      setCardPairsCount(availableQuestionsCount);
    }
  }, [availableQuestionsCount]);

  // Filter topik materi berdasarkan mapel terpilih (gabungan Semester 1 & 2)
  const currentSubjectObj = subjects.find(
    (s) => subjectMatches(s.name, selectedSubject)
  );
  const availableTopics = React.useMemo(() => {
    if (!currentSubjectObj) return [];
    const s1 = currentSubjectObj.topics || [];
    const s2 = currentSubjectObj.topics_semester_2 || [];
    return Array.from(new Set([...s1, ...s2]));
  }, [currentSubjectObj]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let finalName = "";
    let finalMembers: string | undefined = undefined;

    if (playerMode === "individual") {
      finalName = studentName.trim();
      if (!finalName) {
        alert("Harap masukkan nama lengkap murid.");
        return;
      }
    } else if (playerMode === "pair") {
      if (!pairName1.trim() || !pairName2.trim()) {
        alert("Harap masukkan nama kedua siswa yang berpasangan.");
        return;
      }
      finalName = `${pairName1.trim()} & ${pairName2.trim()}`;
      finalMembers = `${pairName1.trim()}, ${pairName2.trim()}`;
    } else {
      finalName = groupName.trim();
      if (!finalName) {
        alert("Harap masukkan nama kelompok.");
        return;
      }
      finalMembers = groupMembers.trim() || undefined;
    }

    onStartGame({
      playerMode,
      studentName: finalName,
      groupMembers: finalMembers,
      studentClass: studentClass.trim(),
      roomCode: roomCode.trim().toUpperCase() || "MIN1-ENDE",
      subject: selectedSubject,
      topic: selectedTopic,
      cardPairsCount,
      timeLimitSeconds,
      difficultyLevel: difficulty,
    });
  };

  // Card Pairs Configuration (Model Kartu UI Berjejer seperti referensi)
  const PAIR_OPTIONS = [
    {
      pairs: 4,
      cards: 4,
      title: "4 Soal",
      badge: "4 Pilihan Kartu",
      subtitle: "Sesi Cepat",
      icon: Target,
      accent: "from-blue-500 to-cyan-500",
      border: "border-blue-400 dark:border-blue-700",
      bgActive: "bg-blue-50/90 dark:bg-blue-950/60 ring-2 ring-blue-500",
    },
    {
      pairs: 6,
      cards: 6,
      title: "6 Soal",
      badge: "4 Pilihan Kartu",
      subtitle: "Standar Kelas",
      icon: Zap,
      accent: "from-emerald-500 to-teal-500",
      border: "border-emerald-400 dark:border-emerald-700",
      bgActive: "bg-emerald-50/90 dark:bg-emerald-950/60 ring-2 ring-emerald-500",
    },
    {
      pairs: 8,
      cards: 8,
      title: "8 Soal",
      badge: "4 Pilihan Kartu",
      subtitle: "Tantangan Kritis",
      icon: Brain,
      accent: "from-amber-500 to-orange-500",
      border: "border-amber-400 dark:border-amber-700",
      bgActive: "bg-amber-50/90 dark:bg-amber-950/60 ring-2 ring-amber-500",
    },
    {
      pairs: 10,
      cards: 10,
      title: "10 Soal",
      badge: "4 Pilihan Kartu",
      subtitle: "Ujian Komprehensif",
      icon: Trophy,
      accent: "from-purple-500 to-rose-500",
      border: "border-purple-400 dark:border-purple-700",
      bgActive: "bg-purple-50/90 dark:bg-purple-950/60 ring-2 ring-purple-500",
    },
  ];

  // Presets Waktu
  const TIME_PRESETS = [
    { label: "3 Menit", seconds: 180, desc: "Kilat" },
    { label: "5 Menit", seconds: 300, desc: "Standar" },
    { label: "7 Menit", seconds: 420, desc: "Mendalam" },
    { label: "10 Menit", seconds: 600, desc: "Kelompok" },
    { label: "Bebas", seconds: 0, desc: "Tanpa Batas" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      {/* Hero Header */}
      <div className="text-center mb-8 flex flex-col items-center">
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-3 rounded-3xl bg-white dark:bg-slate-900 p-2 border-2 border-emerald-500/30 dark:border-emerald-500/40 shadow-lg shadow-emerald-600/10 flex items-center justify-center">
          <Image
            src="/logo/min1ende.webp"
            alt="Logo MIN 1 Ende"
            width={64}
            height={64}
            className="object-contain"
            priority
          />
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-950 dark:bg-emerald-900/70 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 mb-3 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>SD Match • MIN 1 Ende</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-950 dark:text-slate-50 tracking-tight">
          Persiapan Arena Make A Match
        </h1>
        <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mt-2 max-w-lg mx-auto leading-relaxed">
          Atur nama pemain, pilih mata pelajaran, jumlah pasangan kartu, dan durasi bermain sebelum masuk ke arena mencocokkan kartu.
        </p>
      </div>

      {/* Main Preparation Form Container */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-900/5">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ======================================================== */}
          {/* BAGIAN 1: INPUT NAMA MURID / KELOMPOK (OPSI MODE)        */}
          {/* ======================================================== */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>1. Mode & Identitas Pemain</span>
              </label>

              {/* Mode Toggle Pills */}
              <div className="flex flex-wrap p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 gap-0.5">
                <button
                  type="button"
                  onClick={() => setPlayerMode("individual")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    playerMode === "individual"
                      ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Individu</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlayerMode("pair")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    playerMode === "pair"
                      ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Pasangan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlayerMode("group")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    playerMode === "group"
                      ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Kelompok</span>
                </button>
              </div>
            </div>

            {/* Input berdasarkan Mode Pemain */}
            {playerMode === "individual" ? (
              <div>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Ketik nama lengkapmu (contoh: Fatimah Azzahra / Ahmad Fauzan)"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-950 dark:text-slate-50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
                />
              </div>
            ) : playerMode === "pair" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={pairName1}
                  onChange={(e) => setPairName1(e.target.value)}
                  placeholder="Nama Siswa 1 (contoh: Ahmad)"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-950 dark:text-slate-50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
                />
                <input
                  type="text"
                  required
                  value={pairName2}
                  onChange={(e) => setPairName2(e.target.value)}
                  placeholder="Nama Siswa 2 / Pasangan (contoh: Fatimah)"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-950 dark:text-slate-50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Nama Kelompok (contoh: Kelompok Al-Khawarizmi / Kelompok 1)"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-950 dark:text-slate-50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
                />
                <input
                  type="text"
                  value={groupMembers}
                  onChange={(e) => setGroupMembers(e.target.value)}
                  placeholder="Nama Anggota Tim (opsional: Ahmad, Siti, Budi, Fatimah)"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-950 dark:text-slate-50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
                />
              </div>
            )}

            {/* Input Kelas & Kode Room */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <School className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Kelas</span>
                </label>
                <select
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-950 dark:text-slate-50 focus:ring-2 focus:ring-emerald-500"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.name}>
                      Kelas {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Kode Sesi / Room</span>
                </label>
                <input
                  type="text"
                  required
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="MIN1-ENDE"
                  className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-mono font-black uppercase text-slate-950 dark:text-slate-50 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* BAGIAN 2: PILIHAN MATA PELAJARAN (GURU BISA CRUD)        */}
          {/* ======================================================== */}
          <div className="pt-2 border-t-2 border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>2. Pilih Mata Pelajaran</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedSubject("ALL");
                  setSelectedTopic("ALL");
                }}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  selectedSubject === "ALL"
                    ? "border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/60 shadow-sm ring-1 ring-emerald-500"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 hover:border-slate-300"
                }`}
              >
                <span className="text-xl block mb-1">🌟</span>
                <span className="font-black text-xs text-slate-950 dark:text-slate-50 block leading-tight">
                  Semua Mapel
                </span>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                  Campuran Soal
                </span>
              </button>

              {subjects.map((sub) => {
                const isSelected = selectedSubject.toLowerCase() === sub.name.toLowerCase();
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      setSelectedSubject(sub.name);
                      setSelectedTopic("ALL");
                    }}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/60 shadow-sm ring-1 ring-emerald-500"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-xl block mb-1">{sub.icon || "📚"}</span>
                    <span className="font-black text-xs text-slate-950 dark:text-slate-50 block leading-tight truncate">
                      {sub.name}
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                      {sub.topics.length} Materi
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ======================================================== */}
          {/* BAGIAN 3: PILIHAN MATERI POKOK                          */}
          {/* ======================================================== */}
          <div className="pt-2 border-t-2 border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>3. Pilih Materi / Topik Pembelajaran</span>
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedTopic("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                  selectedTopic === "ALL"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                }`}
              >
                🌟 Semua Materi ({selectedSubject === "ALL" ? "Gabungan" : selectedSubject})
              </button>

              {availableTopics.map((top, idx) => {
                const isSelected = selectedTopic.toLowerCase() === top.toLowerCase();
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedTopic(top)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                    }`}
                  >
                    {top}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ======================================================== */}
          {/* BAGIAN 4: PILIHAN JUMLAH SOAL PERMAINAN                  */}
          {/* ======================================================== */}
          <div className="pt-2 border-t-2 border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>4. Pilih Jumlah Soal Permainan</span>
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-black text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                  Tersedia: {availableQuestionsCount} Soal
                </span>
                <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Terpilih: {cardPairsCount} Soal
                </span>
              </div>
            </div>

            {availableQuestionsCount > 0 && availableQuestionsCount < 4 && (
              <div className="mb-2.5 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex items-center justify-between gap-2 text-xs font-bold text-amber-950 dark:text-amber-200">
                <span>
                  Mapel/materi ini saat ini memiliki {availableQuestionsCount} soal aktif.
                </span>
                <button
                  type="button"
                  onClick={() => setCardPairsCount(availableQuestionsCount)}
                  className="px-3 py-1 rounded-xl bg-amber-600 text-white font-black text-[11px] shrink-0 cursor-pointer"
                >
                  Pakai {availableQuestionsCount} Soal
                </button>
              </div>
            )}

            {/* 4 Kolom Kartu Berjejer Melengkung seperti Referensi Gambar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PAIR_OPTIONS.map((opt) => {
                const isSelected = cardPairsCount === opt.pairs;
                const isUnavailable = availableQuestionsCount > 0 && opt.pairs > availableQuestionsCount;
                const IconComp = opt.icon;

                return (
                  <div
                    key={opt.pairs}
                    onClick={() => {
                      if (!isUnavailable) setCardPairsCount(opt.pairs);
                    }}
                    className={`group relative p-4 rounded-3xl border-2 transition-all flex flex-col items-center justify-between text-center select-none ${
                      isUnavailable
                        ? "opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900"
                        : isSelected
                        ? "cursor-pointer border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/60 shadow-lg shadow-emerald-500/15 ring-2 ring-emerald-500 scale-[1.02]"
                        : "cursor-pointer border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60"
                    }`}
                  >
                    {/* Lingkaran Ikon Bagian Atas */}
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-2.5 shadow-sm transition-transform group-hover:scale-110 ${
                        isSelected
                          ? "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-500/30"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>

                    {/* Judul Pasangan */}
                    <div className="font-black text-base text-slate-950 dark:text-slate-50 tracking-tight leading-tight">
                      {opt.title}
                    </div>

                    {/* Keterangan Subtitle */}
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-0.5 mb-2.5">
                      {opt.subtitle}
                    </span>

                    {/* Badge Pill di Bagian Bawah */}
                    <span
                      className={`w-full py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-colors ${
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600"
                      }`}
                    >
                      {opt.badge}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ======================================================== */}
          {/* BAGIAN 5: PENGATURAN WAKTU PERMAINAN                     */}
          {/* ======================================================== */}
          <div className="pt-2 border-t-2 border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>5. Pengaturan Waktu Permainan</span>
              </label>
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                Bobot Nilai Waktu: 10%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {TIME_PRESETS.map((t) => {
                const isSelected = timeLimitSeconds === t.seconds;
                return (
                  <button
                    key={t.seconds}
                    type="button"
                    onClick={() => setTimeLimitSeconds(t.seconds)}
                    className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/60 shadow-sm ring-1 ring-emerald-500"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 hover:border-slate-300"
                    }`}
                  >
                    <span className="font-black text-xs sm:text-sm text-slate-950 dark:text-slate-50 block">
                      {t.label}
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mt-0.5">
                      {t.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ======================================================== */}
          {/* BAGIAN 6: PILIHAN TINGKAT KESULITAN (GAMIFIED CARDS)      */}
          {/* ======================================================== */}
          <div className="pt-2 border-t-2 border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>6. Pilih Tingkat Kesulitan Permainan</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(
                [
                  {
                    lvl: "Easy" as CognitiveLevel,
                    emoji: "🟢",
                    label: "MUDAH",
                    code: "C1 – C2",
                    codeSub: "Mengingat & Memahami",
                    gradientBg: "from-emerald-500 to-green-600",
                    gradientBgActive: "from-emerald-600 to-green-700",
                    borderActive: "border-emerald-500 ring-emerald-500",
                    bgInactive: "bg-emerald-50/80 dark:bg-emerald-950/40",
                    borderInactive: "border-emerald-200 dark:border-emerald-800 hover:border-emerald-400",
                    glowColor: "shadow-emerald-500/30",
                    textInactive: "text-emerald-800 dark:text-emerald-200",
                  },
                  {
                    lvl: "Medium" as CognitiveLevel,
                    emoji: "🟡",
                    label: "SEDANG",
                    code: "C3 – C4",
                    codeSub: "Menerapkan & Menganalisis",
                    gradientBg: "from-amber-500 to-orange-600",
                    gradientBgActive: "from-amber-600 to-orange-700",
                    borderActive: "border-amber-500 ring-amber-500",
                    bgInactive: "bg-amber-50/80 dark:bg-amber-950/40",
                    borderInactive: "border-amber-200 dark:border-amber-800 hover:border-amber-400",
                    glowColor: "shadow-amber-500/30",
                    textInactive: "text-amber-800 dark:text-amber-200",
                  },
                  {
                    lvl: "HOTS" as CognitiveLevel,
                    emoji: "🔴",
                    label: "SULIT",
                    code: "C4 – C6",
                    codeSub: "Evaluasi & Berkreasi",
                    gradientBg: "from-rose-500 to-red-600",
                    gradientBgActive: "from-rose-600 to-red-700",
                    borderActive: "border-rose-500 ring-rose-500",
                    bgInactive: "bg-rose-50/80 dark:bg-rose-950/40",
                    borderInactive: "border-rose-200 dark:border-rose-800 hover:border-rose-400",
                    glowColor: "shadow-rose-500/30",
                    textInactive: "text-rose-800 dark:text-rose-200",
                  },
                ]
              ).map((opt) => {
                const isSelected = difficulty === opt.lvl;
                const info = BLOOM_LEVELS[opt.lvl];
                const lvlCount = levelCounts[opt.lvl];
                const isLevelUnavailable = allActiveQuestions.length > 0 && lvlCount === 0;

                return (
                  <div
                    key={opt.lvl}
                    onClick={() => {
                      if (!isLevelUnavailable) setDifficulty(opt.lvl);
                    }}
                    className={`group relative rounded-3xl border-2 transition-all overflow-hidden select-none ${
                      isLevelUnavailable
                        ? "opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900"
                        : isSelected
                        ? `cursor-pointer ${opt.borderActive} ring-2 shadow-xl ${opt.glowColor} scale-[1.01] sm:scale-[1.02]`
                        : `cursor-pointer ${opt.borderInactive} ${opt.bgInactive} shadow-sm hover:shadow-md`
                    }`}
                  >
                    {/* Kartu Berwarna Gradient untuk yang terpilih */}
                    <div
                      className={`p-3.5 sm:p-5 flex flex-row sm:flex-col items-center sm:text-center gap-3 sm:gap-2 transition-all ${
                        isSelected
                          ? `bg-gradient-to-b ${opt.gradientBg} text-white`
                          : ""
                      }`}
                    >
                      {/* Lingkaran Emoji Indikator */}
                      <div
                        className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-xl sm:text-3xl shrink-0 transition-transform group-hover:scale-110 ${
                          isSelected
                            ? "bg-white/25 shadow-lg"
                            : "bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {opt.emoji}
                      </div>

                      {/* Label Level & Kode Bloom */}
                      <div className="flex-1 sm:flex-initial text-left sm:text-center min-w-0">
                        <div className="flex items-center sm:justify-center gap-1.5 sm:block">
                          <span
                            className={`block text-xs sm:text-base font-black tracking-wide ${
                              isSelected
                                ? "text-white"
                                : "text-slate-950 dark:text-slate-50"
                            }`}
                          >
                            {opt.label}
                          </span>
                          <span
                            className={`block text-[10px] sm:text-[11px] font-bold ${
                              isSelected
                                ? "text-white/80"
                                : "text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            ({info.title})
                          </span>
                        </div>
                        <span
                          className={`inline-block sm:block sm:w-full py-0.5 sm:py-1.5 px-2 sm:px-0 rounded-lg sm:rounded-xl text-[9px] sm:text-[11px] font-black border mt-1 transition-colors ${
                            isSelected
                              ? "bg-white/20 text-white border-white/30"
                              : `bg-white dark:bg-slate-800 ${opt.textInactive} border-slate-200 dark:border-slate-700`
                          }`}
                        >
                          {opt.code} • {lvlCount > 0 ? `${lvlCount} Soal` : "Kosong"}
                        </span>
                        <p
                          className={`text-[9px] sm:text-[10px] font-semibold leading-snug mt-1 hidden sm:block ${
                            isSelected
                              ? "text-white/75"
                              : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {opt.codeSub}
                        </p>
                      </div>

                      {/* Indikator Terpilih */}
                      {isSelected && (
                        <div className="sm:absolute sm:top-2 sm:right-2 shrink-0">
                          <CheckCircle2 className="w-5 h-5 text-white drop-shadow-md" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ======================================================== */}
          {/* TOMBOL MULAI MASUK KE ARENA                             */}
          {/* ======================================================== */}
          <button
            type="submit"
            className="w-full py-4 rounded-2xl font-black text-base text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2.5 active:scale-[0.99] transition-all cursor-pointer mt-4"
          >
            <Gamepad2 className="w-5 h-5" />
            <span>Mulai Arena Make A Match ({cardPairsCount} Pasangan Kartu)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* 4 Pilar Pembelajaran Kooperatif Make A Match */}
      <div className="mt-8">
        <p className="text-center text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          4 Pilar Pembelajaran Kooperatif (Make A Match)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <div className="text-lg mb-1">📖</div>
            <div className="text-xs font-black text-slate-900 dark:text-slate-100">1. Belajar</div>
            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Pahami Konsep</div>
          </div>
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <div className="text-lg mb-1">🎮</div>
            <div className="text-xs font-black text-slate-900 dark:text-slate-100">2. Bermain</div>
            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Cocokkan Kartu</div>
          </div>
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <div className="text-lg mb-1">💡</div>
            <div className="text-xs font-black text-slate-900 dark:text-slate-100">3. Berpikir</div>
            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Nalar Kritis</div>
          </div>
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm text-center">
            <div className="text-lg mb-1">🎙️</div>
            <div className="text-xs font-black text-slate-900 dark:text-slate-100">4. Berargumen</div>
            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Suara / Teks</div>
          </div>
        </div>
      </div>
    </div>
  );
}
