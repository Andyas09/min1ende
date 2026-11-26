"use client";

import React, { useState, useEffect } from "react";
import { ClassItem } from "@/types";
import { getClasses, createClass, updateClass, deleteClass } from "@/lib/supabase";
import {
  Settings,
  Clock,
  Hash,
  Check,
  Save,
  School,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
} from "lucide-react";

interface SessionSettingsTabProps {
  roomCode: string;
  onUpdateRoomCode: (code: string) => void;
  timerLimits: {
    Easy: number;
    Medium: number;
    HOTS: number;
  };
  onUpdateTimerLimits: (limits: { Easy: number; Medium: number; HOTS: number }) => void;
}

export function SessionSettingsTab({
  roomCode,
  onUpdateRoomCode,
  timerLimits,
  onUpdateTimerLimits,
}: SessionSettingsTabProps) {
  const [localRoomCode, setLocalRoomCode] = useState(roomCode);
  const [localLimits, setLocalLimits] = useState(timerLimits);
  const [savedNotice, setSavedNotice] = useState(false);

  // Class Management State
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classesFromDb, setClassesFromDb] = useState<boolean>(true);
  const [loadingClasses, setLoadingClasses] = useState<boolean>(true);
  const [newClassName, setNewClassName] = useState("");
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingClassName, setEditingClassName] = useState("");
  const [classError, setClassError] = useState<string | null>(null);
  const [savingClass, setSavingClass] = useState(false);

  const loadClasses = async () => {
    setLoadingClasses(true);
    const res = await getClasses();
    setClasses(res.classes);
    setClassesFromDb(res.fromDatabase);
    setLoadingClasses(false);
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateRoomCode(localRoomCode.toUpperCase().trim());
    onUpdateTimerLimits(localLimits);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newClassName.trim();
    if (!cleaned) return;
    setClassError(null);
    setSavingClass(true);
    try {
      const created = await createClass({ name: cleaned });
      setClasses((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      setNewClassName("");
    } catch (err: any) {
      setClassError(err?.message || "Gagal menambah kelas.");
    } finally {
      setSavingClass(false);
    }
  };

  const handleSaveEditClass = async (id: string) => {
    const cleaned = editingClassName.trim();
    if (!cleaned) return;
    setClassError(null);
    try {
      const updated = await updateClass(id, { name: cleaned });
      setClasses((prev) =>
        prev
          .map((c) => (c.id === id ? updated : c))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingClassId(null);
      setEditingClassName("");
    } catch (err: any) {
      setClassError(err?.message || "Gagal memperbarui kelas.");
    }
  };

  const handleDeleteClass = async (cls: ClassItem) => {
    if (!confirm(`Hapus Kelas "${cls.name}" dari daftar pilihan murid?`)) return;
    setClassError(null);
    try {
      await deleteClass(cls.id);
      setClasses((prev) => prev.filter((c) => c.id !== cls.id));
    } catch (err: any) {
      setClassError(err?.message || "Gagal menghapus kelas.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* BAGIAN 1: PENGATURAN SESI & TIMER */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950 dark:text-slate-50">
              Pengaturan Sesi & Batas Waktu Permainan
            </h2>
            <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
              Atur kode room sesi kelas MIN 1 Ende dan durasi pengerjaan Make A Match
            </p>
          </div>
        </div>

        {savedNotice && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950 border-2 border-emerald-300 dark:border-emerald-700 text-xs sm:text-sm font-black text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Pengaturan berhasil disimpan dan aktif untuk murid!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* Kode Sesi / Room */}
          <div>
            <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
              <Hash className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Kode Sesi / Room Kelas</span>
            </label>
            <input
              type="text"
              required
              value={localRoomCode}
              onChange={(e) => setLocalRoomCode(e.target.value.toUpperCase())}
              placeholder="MIN1-ENDE"
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-sm font-mono font-black tracking-widest uppercase focus:ring-2 focus:ring-emerald-500 text-slate-950 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
              Bagikan kode ini kepada para murid saat memulai kegiatan pembelajaran kooperatif di kelas.
            </p>
          </div>

          {/* Pengaturan Batas Waktu per Level Bloom */}
          <div>
            <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Batas Waktu Permainan (Countdown Timer dalam Detik)</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700">
                <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 block mb-1">
                  Level Easy (C1-C2)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={60}
                    max={1200}
                    step={30}
                    value={localLimits.Easy}
                    onChange={(e) =>
                      setLocalLimits({ ...localLimits, Easy: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl text-center font-black text-sm bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 text-slate-950 dark:text-slate-50"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">detik</span>
                </div>
                <span className="text-xs font-black text-slate-700 dark:text-slate-300 block mt-1.5 text-center">
                  ({Math.round(localLimits.Easy / 60)} menit)
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700">
                <span className="text-xs font-black text-amber-800 dark:text-amber-300 block mb-1">
                  Level Medium (C3-C4)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={60}
                    max={1200}
                    step={30}
                    value={localLimits.Medium}
                    onChange={(e) =>
                      setLocalLimits({ ...localLimits, Medium: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl text-center font-black text-sm bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 text-slate-950 dark:text-slate-50"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">detik</span>
                </div>
                <span className="text-xs font-black text-slate-700 dark:text-slate-300 block mt-1.5 text-center">
                  ({Math.round(localLimits.Medium / 60)} menit)
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700">
                <span className="text-xs font-black text-rose-800 dark:text-rose-300 block mb-1">
                  Level HOTS (C4-C6)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={60}
                    max={1200}
                    step={30}
                    value={localLimits.HOTS}
                    onChange={(e) =>
                      setLocalLimits({ ...localLimits, HOTS: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl text-center font-black text-sm bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 text-slate-950 dark:text-slate-50"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">detik</span>
                </div>
                <span className="text-xs font-black text-slate-700 dark:text-slate-300 block mt-1.5 text-center">
                  ({Math.round(localLimits.HOTS / 60)} menit)
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-transform cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </form>
      </div>

      {/* BAGIAN 2: PENGATURAN DAFTAR KELAS */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/80 border border-blue-300 dark:border-blue-700 flex items-center justify-center text-blue-700 dark:text-blue-300">
            <School className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950 dark:text-slate-50">
              Pengaturan Daftar Kelas
            </h2>
            <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
              Tambah, ubah, atau hapus kelas yang muncul pada pilihan identitas murid sebelum bermain
            </p>
          </div>
        </div>

        {!classesFromDb && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-300 dark:border-amber-700 text-xs font-bold text-amber-950 dark:text-amber-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <span>
              Tabel <code>classes</code> belum tersedia di Supabase. Jalankan file migrasi{" "}
              <code>supabase/migrations/20261127_revisi_soal_kelas.sql</code> di Supabase SQL Editor agar penambahan kelas tersimpan permanen.
            </span>
          </div>
        )}

        {classError && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-100 dark:bg-rose-950 border-2 border-rose-300 dark:border-rose-800 text-xs font-bold text-rose-950 dark:text-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{classError}</span>
          </div>
        )}

        {/* Form Tambah Kelas Baru */}
        <form onSubmit={handleAddClass} className="flex gap-2 mb-5">
          <input
            type="text"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            placeholder="Ketik nama kelas baru (contoh: 1A, 3C, 5C, 6C)..."
            className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-950 dark:text-slate-50 focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={savingClass || !newClassName.trim()}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{savingClass ? "Menambah..." : "Tambah Kelas"}</span>
          </button>
        </form>

        {/* Daftar Kelas */}
        {loadingClasses ? (
          <p className="text-xs font-bold text-slate-500">Memuat daftar kelas...</p>
        ) : classes.length === 0 ? (
          <p className="text-xs font-bold text-slate-500">Belum ada kelas terdaftar.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700"
              >
                {editingClassId === cls.id ? (
                  <div className="flex items-center gap-1 w-full">
                    <input
                      type="text"
                      value={editingClassName}
                      onChange={(e) => setEditingClassName(e.target.value)}
                      className="w-full px-2 py-1 rounded-lg text-xs font-black bg-white dark:bg-slate-900 border border-blue-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEditClass(cls.id)}
                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                      title="Simpan"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingClassId(null)}
                      className="p-1 text-slate-500 hover:bg-slate-200 rounded cursor-pointer"
                      title="Batal"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">
                      Kelas {cls.name}
                    </span>
                    {classesFromDb && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingClassId(cls.id);
                            setEditingClassName(cls.name);
                          }}
                          className="p-1 text-slate-500 hover:text-blue-600 rounded cursor-pointer"
                          title="Edit Kelas"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClass(cls)}
                          className="p-1 text-slate-500 hover:text-rose-600 rounded cursor-pointer"
                          title="Hapus Kelas"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
