"use client";

import React, { useState, useEffect } from "react";
import { SubjectItem } from "@/types";
import { getSubjects, createSubject, updateSubject, deleteSubject } from "@/lib/supabase";
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Sparkles,
  Layers,
  Tag,
  AlertCircle,
} from "lucide-react";

export function SubjectManagementTab() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📚");
  const [description, setDescription] = useState("");
  const [topicsInput, setTopicsInput] = useState("");

  // Quick topic adder inline
  const [addingTopicSubjectId, setAddingTopicSubjectId] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState("");

  const loadData = async () => {
    setLoading(true);
    const data = await getSubjects();
    setSubjects(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingSubject(null);
    setName("");
    setIcon("📚");
    setDescription("");
    setTopicsInput("");
    setIsModalOpen(true);
  };

  const openEditModal = (item: SubjectItem) => {
    setEditingSubject(item);
    setName(item.name);
    setIcon(item.icon || "📚");
    setDescription(item.description || "");
    setTopicsInput(item.topics.join("\n"));
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Nama mata pelajaran wajib diisi.");
      return;
    }

    const topics = topicsInput
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (editingSubject) {
      const updated = await updateSubject(editingSubject.id, {
        name: name.trim(),
        icon: icon.trim() || "📚",
        description: description.trim(),
        topics: topics.length > 0 ? topics : editingSubject.topics,
      });
      if (updated) {
        setSubjects((prev) => prev.map((s) => (s.id === editingSubject.id ? updated : s)));
      }
    } else {
      const created = await createSubject({
        name: name.trim(),
        icon: icon.trim() || "📚",
        description: description.trim(),
        topics: topics.length > 0 ? topics : [`Semua Materi ${name.trim()}`],
      });
      setSubjects((prev) => [...prev, created]);
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Apakah Ustadz/Ustadzah yakin ingin menghapus mata pelajaran "${name}"?`)) {
      await deleteSubject(id);
      setSubjects((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const handleAddTopicInline = async (subject: SubjectItem) => {
    if (!newTopicName.trim()) return;
    const trimmed = newTopicName.trim();
    if (subject.topics.includes(trimmed)) {
      alert("Materi ini sudah ada di dalam mata pelajaran.");
      return;
    }

    const updatedTopics = [...subject.topics, trimmed];
    const updated = await updateSubject(subject.id, { topics: updatedTopics });
    if (updated) {
      setSubjects((prev) => prev.map((s) => (s.id === subject.id ? updated : s)));
    }
    setNewTopicName("");
    setAddingTopicSubjectId(null);
  };

  const handleRemoveTopic = async (subject: SubjectItem, topicToRemove: string) => {
    if (subject.topics.length <= 1) {
      alert("Mata pelajaran harus memiliki minimal 1 materi.");
      return;
    }
    if (confirm(`Hapus materi "${topicToRemove}" dari ${subject.name}?`)) {
      const updatedTopics = subject.topics.filter((t) => t !== topicToRemove);
      const updated = await updateSubject(subject.id, { topics: updatedTopics });
      if (updated) {
        setSubjects((prev) => prev.map((s) => (s.id === subject.id ? updated : s)));
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-slate-50 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Kelola Mata Pelajaran & Materi</span>
          </h2>
          <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mt-1">
            Atur kurikulum mata pelajaran dan sub-topik materi untuk permainan Make A Match.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-transform cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Mata Pelajaran</span>
        </button>
      </div>

      {/* Grid Subjects */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 font-bold">Memuat daftar mata pelajaran...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {subjects.map((item) => (
            <div
              key={item.id}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
            >
              <div>
                {/* Header Card */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                      {item.icon || "📚"}
                    </span>
                    <div>
                      <h3 className="text-lg font-black text-slate-950 dark:text-slate-50">
                        {item.name}
                      </h3>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                        {item.description || "Mata pelajaran madrasah"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Edit Mata Pelajaran"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.name)}
                      className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Hapus Mata Pelajaran"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sub-Topics (Materi) Section */}
                <div className="mt-4 pt-4 border-t-2 border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Daftar Materi ({item.topics.length})</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setAddingTopicSubjectId(addingTopicSubjectId === item.id ? null : item.id);
                        setNewTopicName("");
                      }}
                      className="text-xs font-black text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Materi</span>
                    </button>
                  </div>

                  {/* Inline Add Topic Input */}
                  {addingTopicSubjectId === item.id && (
                    <div className="flex items-center gap-2 mb-3 animate-fade-in">
                      <input
                        type="text"
                        autoFocus
                        value={newTopicName}
                        onChange={(e) => setNewTopicName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddTopicInline(item)}
                        placeholder="Ketik nama materi baru..."
                        className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-emerald-500 text-xs font-bold text-slate-950 dark:text-slate-50 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddTopicInline(item)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 transition-colors"
                      >
                        Simpan
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddingTopicSubjectId(null)}
                        className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Topics Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {item.topics.map((topic, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700"
                      >
                        <Tag className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>{topic}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTopic(item, topic)}
                          className="hover:text-rose-600 dark:hover:text-rose-400 ml-0.5 text-slate-400"
                          title="Hapus materi ini"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah / Edit Mata Pelajaran */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-slate-300 dark:border-slate-700 p-6 sm:p-8">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-slate-950 dark:text-slate-50 mb-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>{editingSubject ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran Baru"}</span>
            </h3>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-5">
              Isi informasi mata pelajaran dan materi pokok pembelajarannya.
            </p>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1">
                    Ikon / Emoji
                  </label>
                  <input
                    type="text"
                    required
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="🔬"
                    className="w-full text-center py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-lg font-bold text-slate-950 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="col-span-3">
                  <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1">
                    Nama Mata Pelajaran
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Akidah Akhlak / Bahasa Inggris"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-950 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1">
                  Deskripsi Singkat
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Keterangan fokus pembelajaran..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-950 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1">
                  Daftar Materi (1 materi per baris)
                </label>
                <textarea
                  rows={4}
                  value={topicsInput}
                  onChange={(e) => setTopicsInput(e.target.value)}
                  placeholder={"Ekosistem & Rantai Makanan\nWujud Benda\nGaya & Gerak"}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-950 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20"
                >
                  Simpan Mata Pelajaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
