"use client";

import React, { useState, useEffect } from "react";
import { Question, QuestionInsert, CognitiveLevel, SubjectItem } from "@/types";
import { BLOOM_LEVELS } from "@/lib/seed-data";
import {
  getAllQuestionsForTeacher,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  uploadQuestionImage,
  getSubjects,
} from "@/lib/supabase";
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
} from "lucide-react";

export function QuestionBankTab() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("ALL");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Form State
  const [formData, setFormData] = useState<QuestionInsert>({
    subject: "IPAS / Sains",
    topic: "Ekosistem & Hewan",
    difficulty_level: "Easy",
    question_text: "",
    question_image_url: null,
    answer_text: "",
    answer_image_url: null,
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
    const defaultSub = subjects[0]?.name || "IPAS / Sains";
    const defaultTop = subjects[0]?.topics[1] || subjects[0]?.topics[0] || "Ekosistem & Hewan";
    setFormData({
      subject: defaultSub,
      topic: defaultTop,
      difficulty_level: "Easy",
      question_text: "",
      question_image_url: null,
      answer_text: "",
      answer_image_url: null,
      explanation: "",
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (q: Question) => {
    setEditingQuestion(q);
    setFormData({
      subject: q.subject,
      topic: q.topic || "",
      difficulty_level: q.difficulty_level,
      question_text: q.question_text,
      question_image_url: q.question_image_url,
      answer_text: q.answer_text,
      answer_image_url: q.answer_image_url,
      explanation: q.explanation,
      is_active: q.is_active,
    });
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

    if (editingQuestion) {
      const updated = await updateQuestion(editingQuestion.id, formData);
      if (updated) {
        setQuestions((prev) => prev.map((q) => (q.id === editingQuestion.id ? updated : q)));
      }
    } else {
      const created = await createQuestion(formData);
      setQuestions((prev) => [created, ...prev]);
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Apakah Ustadz/Ustadzah yakin ingin menghapus soal pasangan ini?")) {
      const success = await deleteQuestion(id);
      if (success) {
        setQuestions((prev) => prev.filter((q) => q.id !== id));
      }
    }
  };

  const filteredQuestions = questions.filter((q) => {
    const matchSearch =
      q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.answer_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.topic && q.topic.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchLevel = selectedDifficulty === "ALL" || q.difficulty_level === selectedDifficulty;
    const matchSubject = selectedSubjectFilter === "ALL" || q.subject.toLowerCase().includes(selectedSubjectFilter.toLowerCase());
    return matchSearch && matchLevel && matchSubject;
  });

  // Topics for selected subject in modal form
  const currentSubjectObj = subjects.find(
    (s) => s.name.toLowerCase() === formData.subject.toLowerCase()
  );
  const availableTopics = currentSubjectObj ? currentSubjectObj.topics : [];

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
            Kelola pasangan kartu soal & jawaban interaktif untuk MIN 1 Ende
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-transform cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Soal Baru</span>
        </button>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Mata Pelajaran */}
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1.5">
                    Mata Pelajaran
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => {
                      const newSub = e.target.value;
                      const subObj = subjects.find((s) => s.name === newSub);
                      const defaultTop = subObj?.topics[0] || "";
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
    </div>
  );
}
