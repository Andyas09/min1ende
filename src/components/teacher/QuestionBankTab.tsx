"use client";

import React, { useState, useEffect } from "react";
import { Question, QuestionInsert, CognitiveLevel, SubjectItem, Semester } from "@/types";
import { BLOOM_LEVELS } from "@/lib/seed-data";
import {
  getAllQuestionsForTeacher,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  uploadQuestionImage,
  getSubjects,
} from "@/lib/supabase";
import { subjectMatches } from "@/lib/game-engine";
import { ExcelImportModal } from "./ExcelImportModal";
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Sparkles,
  BookOpen,
  Tag,
  Layers,
  FileSpreadsheet,
} from "lucide-react";

interface QuestionBankTabProps {
  teacherSubject?: string;
  isAdmin?: boolean;
}

export function QuestionBankTab({
  teacherSubject = "Semua Mapel",
  isAdmin = false,
}: QuestionBankTabProps = {}) {
  const isSubjectRestricted = !isAdmin && !!teacherSubject && teacherSubject !== "Semua Mapel";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("ALL");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("ALL");
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<"ALL" | Semester>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [keywordsInput, setKeywordsInput] = useState("");

  // Form State
  const [formData, setFormData] = useState<QuestionInsert>({
    subject: "IPAS / Sains",
    topic: "Ekosistem & Hewan",
    semester: 1,
    difficulty_level: "Easy",
    question_text: "",
    question_image_url: null,
    answer_text: "",
    answer_image_url: null,
    wrong_answers: ["", "", ""],
    explanation: "",
    is_active: true,
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [qData, sData] = await Promise.all([
      getAllQuestionsForTeacher(),
      getSubjects(),
    ]);
    setQuestions(qData);
    setSubjects(sData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingQuestion(null);
    const targetSub = isSubjectRestricted
      ? teacherSubject
      : subjects[0]?.name || "IPAS / Sains";
    const subObj = subjects.find(
      (s) => s.name.toLowerCase() === targetSub.toLowerCase()
    );
    const defaultTop = subObj?.topics[0] || "Materi Pokok";
    setFormData({
      subject: targetSub,
      topic: defaultTop,
      semester: 1,
      difficulty_level: "Easy",
      question_text: "",
      question_image_url: null,
      answer_text: "",
      answer_image_url: null,
      wrong_answers: ["", "", ""],
      keywords: [],
      explanation: "",
      is_active: true,
    });
    setKeywordsInput("");
    setIsModalOpen(true);
  };

  const openEditModal = (q: Question) => {
    setEditingQuestion(q);
    const existingWrong = q.wrong_answers || [];
    const existingKeywords = q.keywords || [];
    setFormData({
      subject: isSubjectRestricted ? teacherSubject : q.subject,
      topic: q.topic || "",
      semester: q.semester || 1,
      difficulty_level: q.difficulty_level,
      question_text: q.question_text,
      question_image_url: q.question_image_url,
      answer_text: q.answer_text,
      answer_image_url: q.answer_image_url,
      wrong_answers: [existingWrong[0] || "", existingWrong[1] || "", existingWrong[2] || ""],
      keywords: existingKeywords,
      explanation: q.explanation,
      is_active: q.is_active,
    });
    setKeywordsInput(existingKeywords.join(", "));
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "question" | "answer") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const res = await uploadQuestionImage(file);
    if (res.url) {
      if (field === "question") {
        setFormData((prev) => ({ ...prev, question_image_url: res.url }));
      } else {
        setFormData((prev) => ({ ...prev, answer_image_url: res.url }));
      }
    } else {
      alert("Gagal mengunggah gambar: " + res.error);
    }
    setUploadingImage(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question_text.trim() || !formData.answer_text.trim() || !formData.explanation.trim()) {
      alert("Harap lengkapi pertanyaan, jawaban, dan penjelasan.");
      return;
    }

    const cleanedWrong = (formData.wrong_answers || [])
      .map((w) => w.trim())
      .filter((w) => w.length > 0 && w.toLowerCase() !== formData.answer_text.trim().toLowerCase());

    const cleanedKeywords = keywordsInput
      .split(/[,;]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    const payload: QuestionInsert = {
      ...formData,
      wrong_answers: cleanedWrong,
      keywords: cleanedKeywords,
    };

    try {
      if (editingQuestion) {
        const updated = await updateQuestion(editingQuestion.id, payload);
        if (updated) {
          setQuestions((prev) => prev.map((q) => (q.id === editingQuestion.id ? updated : q)));
        }
      } else {
        const created = await createQuestion(payload);
        setQuestions((prev) => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err?.message || "Gagal menyimpan soal ke Supabase.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Apakah Ustadz/Ustadzah yakin ingin menghapus soal pasangan ini?")) {
      try {
        const success = await deleteQuestion(id);
        if (success) {
          setQuestions((prev) => prev.filter((q) => q.id !== id));
        }
      } catch (err: any) {
        alert(err?.message || "Gagal menghapus soal.");
      }
    }
  };

  const filteredQuestions = questions.filter((q) => {
    // Jika guru terikat mapel tertentu dan bukan admin, hanya tampilkan soal mapel tersebut
    if (isSubjectRestricted && !subjectMatches(q.subject, teacherSubject)) {
      return false;
    }

    const matchSearch =
      q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.answer_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.topic && q.topic.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchLevel = selectedDifficulty === "ALL" || q.difficulty_level === selectedDifficulty;
    const matchSemester =
      selectedSemesterFilter === "ALL" || (q.semester ?? 1) === selectedSemesterFilter;
    const matchSubject =
      isSubjectRestricted ||
      selectedSubjectFilter === "ALL" ||
      subjectMatches(q.subject, selectedSubjectFilter);
    return matchSearch && matchLevel && matchSemester && matchSubject;
  });

  // Topics for selected subject & semester in modal form
  const currentSubjectObj = subjects.find(
    (s) => subjectMatches(s.name, formData.subject)
  );
  const availableTopics = currentSubjectObj
    ? formData.semester === 2
      ? currentSubjectObj.topics_semester_2 || []
      : currentSubjectObj.topics
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-slate-50 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Bank Soal Kartu Make A Match
          </h2>
          <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mt-0.5">
            {isSubjectRestricted
              ? `Kelola bank soal khusus mata pelajaran ${teacherSubject} untuk MIN 1 Ende`
              : "Kelola pasangan kartu soal & jawaban interaktif untuk MIN 1 Ende"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsExcelModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-black text-sm text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 border-2 border-emerald-300 dark:border-emerald-700 shadow-sm active:scale-95 transition-transform cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Upload Soal (Excel / Word)</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-transform cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Soal Baru</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-500 dark:text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari soal, jawaban, atau mata pelajaran..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-950 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        {/* Filter Mapel */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          {isSubjectRestricted ? (
            <div className="px-3.5 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-700 text-xs font-black text-emerald-800 dark:text-emerald-300 shadow-sm flex items-center gap-1.5 whitespace-nowrap">
              <Tag className="w-3.5 h-3.5" />
              <span>Mapel Anda: {teacherSubject}</span>
            </div>
          ) : (
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="px-3.5 py-3 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-xs font-black text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm cursor-pointer"
            >
              <option value="ALL">Semua Mata Pelajaran</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.name}>
                  {sub.icon} {sub.name}
                </option>
              ))}
            </select>
          )}

          {/* Filter Semester */}
          <select
            value={selectedSemesterFilter}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedSemesterFilter(val === "ALL" ? "ALL" : (Number(val) as Semester));
            }}
            className="px-3.5 py-3 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-xs font-black text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm cursor-pointer"
          >
            <option value="ALL">Semua Semester</option>
            <option value={1}>Semester 1</option>
            <option value={2}>Semester 2</option>
          </select>

          {/* Filter Level */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm">
            <Filter className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            {(["ALL", "Easy", "Medium", "HOTS"] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setSelectedDifficulty(lvl)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer ${
                  selectedDifficulty === lvl
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {lvl === "ALL" ? "Semua Level" : lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Questions Grid / List */}
      {loading ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800">
          <Sparkles className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-black text-slate-700 dark:text-slate-300">Memuat Bank Soal...</p>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-8">
          <BookOpen className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Belum Ada Soal</h3>
          <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Tidak ditemukan soal yang cocok. Klik tombol &quot;Tambah Soal Baru&quot; di atas untuk membuat pasangan kartu Make A Match.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuestions.map((q) => {
            const bloomInfo = BLOOM_LEVELS[q.difficulty_level] || BLOOM_LEVELS.Easy;
            return (
              <div
                key={q.id}
                className="group relative flex flex-col justify-between p-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-500 shadow-sm hover:shadow-md transition-all"
              >
                <div>
                  {/* Badge Level & Subject */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700">
                        {q.subject}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                          (q.semester ?? 1) === 2
                            ? "bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                            : "bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                        }`}
                      >
                        Sem {q.semester ?? 1}
                      </span>
                      {q.topic && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {q.topic}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${bloomInfo.badgeBg} ${bloomInfo.badgeText}`}
                    >
                      {q.difficulty_level}
                    </span>
                  </div>

                  {/* Pasangan Kartu Preview */}
                  <div className="space-y-2 mb-4">
                    {/* Kartu Soal */}
                    <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/80 border-2 border-blue-200 dark:border-blue-800">
                      <span className="text-[10px] font-black text-blue-950 dark:text-blue-300 uppercase tracking-wide">
                        Kartu Soal
                      </span>
                      <p className="text-xs sm:text-sm font-black text-slate-950 dark:text-slate-50 line-clamp-3 mt-0.5">
                        {q.question_text}
                      </p>
                      {q.question_image_url && (
                        <div className="mt-2 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1 font-bold">
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Ada Lampiran Gambar</span>
                        </div>
                      )}
                    </div>

                    {/* Kartu Jawaban */}
                    <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border-2 border-emerald-200 dark:border-emerald-800">
                      <span className="text-[10px] font-black text-emerald-950 dark:text-emerald-300 uppercase tracking-wide">
                        Kunci Pasangan
                      </span>
                      <p className="text-xs sm:text-sm font-black text-emerald-950 dark:text-emerald-200 mt-0.5">
                        {q.answer_text}
                      </p>
                      {q.wrong_answers && q.wrong_answers.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Pengecoh:</span>
                          {q.wrong_answers.map((wa, i) => (
                            <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                              {wa}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pembahasan / Penjelasan */}
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-200 line-clamp-3">
                    <strong className="text-slate-950 dark:text-white font-black">Pembahasan: </strong>
                    {q.explanation}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t-2 border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => openEditModal(q)}
                    className="p-2 rounded-xl text-slate-700 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                    title="Edit Soal"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(q.id)}
                    className="p-2 rounded-xl text-slate-700 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                    title="Hapus Soal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CREATE / EDIT QUESTION */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-slate-300 dark:border-slate-700 p-6 sm:p-8">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-slate-50 mb-1">
              {editingQuestion ? "Edit Soal Pasangan" : "Tambah Soal Pasangan Baru"}
            </h3>
            <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-5">
              Tentukan kartu soal, kartu jawaban kunci, tingkat Bloom, dan penjelasan edukatif.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Mata Pelajaran */}
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1.5">
                    Mata Pelajaran {isSubjectRestricted && <span className="text-emerald-600 dark:text-emerald-400 font-bold">(Terkunci)</span>}
                  </label>
                  {isSubjectRestricted ? (
                    <div className="w-full px-3 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 flex items-center justify-between">
                      <span>{teacherSubject}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                        Mapel Anda
                      </span>
                    </div>
                  ) : (
                    <select
                      value={formData.subject}
                      onChange={(e) => {
                        const newSub = e.target.value;
                        const subObj = subjects.find((s) => s.name === newSub);
                        const semTopics =
                          formData.semester === 2
                            ? subObj?.topics_semester_2 || []
                            : subObj?.topics || [];
                        const defaultTop = semTopics[0] || "";
                        setFormData({ ...formData, subject: newSub, topic: defaultTop });
                      }}
                      className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-950 dark:text-slate-50 focus:ring-2 focus:ring-emerald-500"
                    >
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.name}>
                          {sub.icon} {sub.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Semester */}
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1.5">
                    Semester
                  </label>
                  <select
                    value={formData.semester || 1}
                    onChange={(e) => {
                      const newSem = Number(e.target.value) as Semester;
                      const semTopics =
                        newSem === 2
                          ? currentSubjectObj?.topics_semester_2 || []
                          : currentSubjectObj?.topics || [];
                      setFormData({
                        ...formData,
                        semester: newSem,
                        topic: semTopics[0] || "",
                      });
                    }}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-950 dark:text-slate-50 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={1}>Semester 1 (Ganjil)</option>
                    <option value={2}>Semester 2 (Genap)</option>
                  </select>
                </div>

                {/* Materi / Topik */}
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1.5">
                    Materi Pokok
                  </label>
                  {availableTopics.length > 0 ? (
                    <select
                      value={formData.topic || ""}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-950 dark:text-slate-50 focus:ring-2 focus:ring-emerald-500"
                    >
                      {availableTopics.map((top, idx) => (
                        <option key={idx} value={top}>
                          {top}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.topic || ""}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      placeholder="Ketik nama materi..."
                      className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-950 dark:text-slate-50 focus:ring-2 focus:ring-emerald-500"
                    />
                  )}
                </div>

                {/* Tingkat Kognitif Bloom */}
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1.5">
                    Tingkat (Bloom)
                  </label>
                  <select
                    value={formData.difficulty_level}
                    onChange={(e) =>
                      setFormData({ ...formData, difficulty_level: e.target.value as CognitiveLevel })
                    }
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-950 dark:text-slate-50 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Easy">Easy (C1–C2)</option>
                    <option value="Medium">Medium (C3–C4)</option>
                    <option value="HOTS">HOTS (C4–C6)</option>
                  </select>
                </div>
              </div>

              {/* Teks Kartu Soal */}
              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1.5">
                  Isi Kartu Soal (Pertanyaan / Petunjuk)
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.question_text}
                  onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                  placeholder="Ketikkan teks soal yang akan ditampilkan pada kartu biru..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-950 dark:text-slate-50 focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                <div className="mt-2 flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{uploadingImage ? "Mengunggah..." : "Lampirkan Gambar Soal"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, "question")}
                    />
                  </label>
                  {formData.question_image_url && (
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Gambar terpasang
                    </span>
                  )}
                </div>
              </div>

              {/* Teks Kartu Jawaban */}
              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1.5">
                  Isi Kartu Jawaban Kunci (Pasangan Tepat)
                </label>
                <input
                  type="text"
                  required
                  value={formData.answer_text}
                  onChange={(e) => setFormData({ ...formData, answer_text: e.target.value })}
                  placeholder="Ketikkan jawaban tepat yang akan dicocokkan murid..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-950 dark:text-slate-50 focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              {/* Pilihan Kartu Jawaban Salah / Pengecoh (Distractors) */}
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Pilihan Kartu Jawaban Salah / Pengecoh (Opsional)</span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                    Maksimal 3 Pengecoh
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 leading-snug">
                  Kartu pengecoh akan dimunculkan bersama kartu jawaban kunci saat murid bermain (total 4 pilihan kartu). Jika dikosongkan, sistem secara otomatis mengambil pengecoh dari bank soal lain.
                </p>
                <div className="space-y-2">
                  {[0, 1, 2].map((idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={formData.wrong_answers?.[idx] || ""}
                      onChange={(e) => {
                        const updatedWrong = [...(formData.wrong_answers || ["", "", ""])];
                        updatedWrong[idx] = e.target.value;
                        setFormData({ ...formData, wrong_answers: updatedWrong });
                      }}
                      placeholder={`Pilihan kartu salah / pengecoh ${idx + 1}...`}
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-950 dark:text-slate-50 focus:ring-2 focus:ring-amber-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  ))}
                </div>
              </div>

              {/* Kata Kunci Argumentasi */}
              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1.5">
                  Kata Kunci Wajib dalam Argumentasi (Pisahkan dengan koma)
                </label>
                <input
                  type="text"
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  placeholder="Contoh: herbivora, tumbuhan, rumput (opsional, otomatis dari kunci jawaban jika kosong)"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-950 dark:text-slate-50 focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-1">
                  Jika penjelasan murid tidak memuat salah satu kata kunci ini, argumentasi dianggap tidak sesuai.
                </p>
              </div>

              {/* Teks Pembahasan / Penjelasan Edukatif */}
              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1.5">
                  Pembahasan / Penjelasan Materi (Muncul saat Verifikasi)
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  placeholder="Penjelasan mendalam mengapa pasangan ini benar, untuk penguatan literasi murid..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-950 dark:text-slate-50 focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t-2 border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-transform cursor-pointer"
                >
                  {editingQuestion ? "Simpan Perubahan" : "Simpan ke Bank Soal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL UPLOAD EXCEL */}
      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onImported={(created) => {
          setQuestions((prev) => [...created, ...prev]);
        }}
        teacherSubject={teacherSubject}
        isSubjectRestricted={isSubjectRestricted}
        subjects={subjects}
      />
    </div>
  );
}
