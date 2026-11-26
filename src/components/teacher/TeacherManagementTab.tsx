"use client";

import React, { useState, useEffect } from "react";
import { SubjectItem } from "@/types";
import {
  TeacherAccount,
  getTeachersList,
  createTeacherAccount,
  updateTeacherAccount,
  deleteTeacherAccount,
  getSubjects,
} from "@/lib/supabase";
import {
  ShieldCheck,
  UserPlus,
  Edit2,
  Trash2,
  X,
  Search,
  School,
  Mail,
  User,
  KeyRound,
  Eye,
  EyeOff,
  BookOpen,
} from "lucide-react";

interface TeacherManagementTabProps {
  currentAdminEmail: string;
}

export function TeacherManagementTab({ currentAdminEmail }: TeacherManagementTabProps) {
  const [teachers, setTeachers] = useState<TeacherAccount[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherAccount | null>(null);

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [school, setSchool] = useState("MIN 1 Ende");
  const [password, setPassword] = useState("");
  const [subject, setSubject] = useState("Semua Mapel");
  const [role, setRole] = useState<"admin" | "guru">("guru");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Map to store unmasked passwords in table view
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const loadData = async () => {
    setLoading(true);
    const [tList, sList] = await Promise.all([
      getTeachersList(),
      getSubjects(),
    ]);
    setTeachers(tList);
    setSubjects(sList);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingTeacher(null);
    setFullName("");
    setEmail("");
    setSchool("MIN 1 Ende");
    setPassword("");
    setSubject(subjects[0]?.name || "Semua Mapel");
    setRole("guru");
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const openEditModal = (tch: TeacherAccount) => {
    setEditingTeacher(tch);
    setFullName(tch.full_name);
    setEmail(tch.email);
    setSchool(tch.school || "MIN 1 Ende");
    setPassword(tch.password || "");
    setSubject(tch.subject || "Semua Mapel");
    setRole(tch.role);
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      alert("Harap lengkapi nama lengkap dan email guru.");
      return;
    }

    setSaving(true);
    if (editingTeacher) {
      const updated = await updateTeacherAccount(editingTeacher.id, {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        school: school.trim() || "MIN 1 Ende",
        password: password.trim() || editingTeacher.password || "min1ende123",
        subject: subject.trim() || "Semua Mapel",
        role,
      });
      if (updated) {
        setTeachers((prev) =>
          prev.map((t) => (t.id === editingTeacher.id ? { ...t, ...updated } : t))
        );
      }
    } else {
      // Cek apakah email sudah ada
      if (teachers.some((t) => t.email.toLowerCase() === email.trim().toLowerCase())) {
        alert("Email guru ini sudah terdaftar di sistem.");
        setSaving(false);
        return;
      }
      const created = await createTeacherAccount({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        school: school.trim() || "MIN 1 Ende",
        password: password.trim() || "min1ende123",
        subject: subject.trim() || "Semua Mapel",
        role,
      });
      setTeachers((prev) => [created, ...prev]);
    }

    setSaving(false);
    setIsModalOpen(false);
  };

  const handleDelete = async (tch: TeacherAccount) => {
    if (tch.email.toLowerCase() === "admin@min1ende.com") {
      alert("Akun Administrator Utama (admin@min1ende.com) tidak dapat dihapus!");
      return;
    }

    if (tch.email.toLowerCase() === currentAdminEmail.toLowerCase()) {
      alert("Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif!");
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus akun guru "${tch.full_name}" (${tch.email})?`)) {
      const ok = await deleteTeacherAccount(tch.id);
      if (ok) {
        setTeachers((prev) => prev.filter((t) => t.id !== tch.id));
      }
    }
  };

  const filteredTeachers = teachers.filter(
    (t) =>
      t.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.subject && t.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.school && t.school.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-slate-50 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <span>Manajemen Akun Guru & Fasilitator</span>
            </h2>
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-950 dark:bg-purple-950/70 dark:text-purple-200 border border-purple-300 dark:border-purple-800">
              Khusus Administrator
            </span>
          </div>
          <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mt-1">
            Kelola data pendidik, penugasan mata pelajaran pengampu, asal madrasah, dan kata sandi login.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-transform cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Akun Guru</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500 dark:text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari guru berdasarkan nama, email, mata pelajaran, atau sekolah..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-950 dark:text-slate-50 focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Teachers List Table */}
      <div className="overflow-x-auto rounded-3xl border-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left text-xs sm:text-sm text-slate-800 dark:text-slate-200">
          <thead className="bg-slate-100 dark:bg-slate-800 font-black text-slate-950 dark:text-slate-50 uppercase tracking-wider border-b-2 border-slate-300 dark:border-slate-700">
            <tr>
              <th className="py-4 px-4">Nama Lengkap Guru</th>
              <th className="py-4 px-4">Guru Mata Pelajaran</th>
              <th className="py-4 px-4">Email Login</th>
              <th className="py-4 px-4">Sekolah / Madrasah</th>
              <th className="py-4 px-4">Kata Sandi</th>
              <th className="py-4 px-3 text-center">Hak Akses Role</th>
              <th className="py-4 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800 font-semibold">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 font-black text-slate-600 dark:text-slate-400">
                  Memuat data akun guru...
                </td>
              </tr>
            ) : filteredTeachers.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 font-bold text-slate-600 dark:text-slate-400">
                  Tidak ditemukan akun guru yang cocok.
                </td>
              </tr>
            ) : (
              filteredTeachers.map((tch) => {
                const isAdmin = tch.role === "admin";
                const isPrimaryAdmin = tch.email.toLowerCase() === "admin@min1ende.com";
                const isPasswordShown = Boolean(visiblePasswords[tch.id]);

                return (
                  <tr key={tch.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="py-4 px-4 font-black text-slate-950 dark:text-slate-50">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 ${
                            isAdmin
                              ? "bg-purple-100 text-purple-950 dark:bg-purple-900/60 dark:text-purple-200 border border-purple-300 dark:border-purple-700"
                              : "bg-emerald-100 text-emerald-950 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700"
                          }`}
                        >
                          {isAdmin ? "👑" : "👨‍🏫"}
                        </div>
                        <div>
                          <span className="block">{tch.full_name}</span>
                          {isPrimaryAdmin && (
                            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">
                              ★ Akun Utama Administrator
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Guru Mata Pelajaran */}
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-blue-50 text-blue-900 dark:bg-blue-950/70 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                        <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>{tch.subject || "Semua Mapel"}</span>
                      </span>
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {tch.email}
                    </td>

                    <td className="py-4 px-4 font-bold text-slate-700 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1.5">
                        <School className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{tch.school || "MIN 1 Ende"}</span>
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 w-fit">
                        <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                        <span>{isPasswordShown ? tch.password || "min1ende123" : "••••••••"}</span>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(tch.id)}
                          className="text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 p-0.5 ml-1 cursor-pointer"
                          title={isPasswordShown ? "Sembunyikan sandi" : "Tampilkan sandi"}
                        >
                          {isPasswordShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>

                    <td className="py-4 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black border ${
                          isAdmin
                            ? "bg-purple-100 text-purple-950 dark:bg-purple-950/70 dark:text-purple-200 border-purple-300 dark:border-purple-700"
                            : "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/70 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700"
                        }`}
                      >
                        {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                        <span>{isAdmin ? "Administrator" : "Guru"}</span>
                      </span>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(tch)}
                          className="p-2 rounded-xl text-slate-700 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                          title="Edit Akun"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!isPrimaryAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDelete(tch)}
                            className="p-2 rounded-xl text-slate-700 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                            title="Hapus Akun Guru"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Tambah / Edit Akun Guru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-slate-300 dark:border-slate-700 p-6 sm:p-8 max-h-[92vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-slate-950 dark:text-slate-50 mb-1 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>{editingTeacher ? "Edit Akun Pendidik" : "Tambah Akun Guru Baru"}</span>
            </h3>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-5">
              Pilih mata pelajaran yang diampu guru ini sesuai mata pelajaran yang tersedia di kurikulum.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1.5">
                  Nama Lengkap Guru (Full Name)
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Ustadzah Siti Aminah, S.Pd.I"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-950 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* PILIHAN MATA PELAJARAN YANG DIENGPU (DINAMIS SESUAI MAPEL TERSEDIA) */}
              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Guru Mata Pelajaran Pengampu</span>
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-950 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="Semua Mapel">🌟 Semua Mapel (Guru Kelas / Umum)</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.name}>
                      {sub.icon || "📚"} {sub.name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 block">
                  *Guru akan difokuskan mengelola soal dan evaluasi mata pelajaran ini.
                </span>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1.5">
                  Alamat Email (Email Login)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama.guru@min1ende.sch.id"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-950 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1.5">
                  Asal Sekolah / Madrasah (School)
                </label>
                <div className="relative">
                  <School className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <input
                    type="text"
                    required
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="MIN 1 Ende"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-950 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1.5">
                  Kata Sandi Login (Password)
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required={!editingTeacher}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingTeacher ? "Ketik sandi baru (kosongkan jika tidak diubah)" : "••••••••"}
                    className="w-full pl-10 pr-11 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-950 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3.5 top-2.5 p-1 rounded-lg text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1.5">
                  Wewenang Role Hak Akses
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("guru")}
                    className={`p-3 rounded-2xl border-2 text-left cursor-pointer transition-all ${
                      role === "guru"
                        ? "border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/60 ring-2 ring-emerald-500"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60"
                    }`}
                  >
                    <span className="block font-black text-xs text-slate-950 dark:text-slate-50">
                      👨‍🏫 Guru / Fasilitator
                    </span>
                    <span className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                      Kelola Soal & Evaluasi
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole("admin")}
                    className={`p-3 rounded-2xl border-2 text-left cursor-pointer transition-all ${
                      role === "admin"
                        ? "border-purple-500 bg-purple-50/90 dark:bg-purple-950/60 ring-2 ring-purple-500"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60"
                    }`}
                  >
                    <span className="block font-black text-xs text-slate-950 dark:text-slate-50">
                      👑 Administrator
                    </span>
                    <span className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                      Akses Penuh + CRUD Guru
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  {saving ? "Menyimpan..." : "Simpan Akun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
