"use client";

import React, { useState } from "react";
import Image from "next/image";
import { X, Mail, KeyRound, AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface TeacherAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (teacherInfo: { email: string; name: string; role?: "admin" | "guru"; subject?: string }) => void;
}

export function TeacherAuthModal({ isOpen, onClose, onSuccess }: TeacherAuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      // admin@min1ende.com otomatis berstatus administrator
      const isAdminEmail = cleanEmail === "admin@min1ende.com";

      if (!isSupabaseConfigured()) {
        if (cleanEmail && password.trim()) {
          onSuccess({
            email: cleanEmail,
            name: isAdminEmail ? "Administrator MIN 1 Ende" : cleanEmail.split("@")[0] || "Guru MIN 1 Ende",
            role: isAdminEmail ? "admin" : "guru",
            subject: "Semua Mapel",
          });
          onClose();
          return;
        } else {
          throw new Error("Mohon masukkan email dan password.");
        }
      }

      // 1. Untuk akun bukan admin utama, cek tabel profiles Supabase terlebih dahulu agar tidak memicu 400 di auth/token
      if (!isAdminEmail) {
        const { data: profileUser, error: profileErr } = await (supabase.from("profiles") as any)
          .select("*")
          .ilike("email", cleanEmail)
          .eq("password", password)
          .maybeSingle();

        if (!profileErr && profileUser) {
          onSuccess({
            email: profileUser.email || cleanEmail,
            name: profileUser.full_name || "Guru MIN 1 Ende",
            role: profileUser.role === "admin" ? "admin" : "guru",
            subject: profileUser.subject || "Semua Mapel",
          });
          onClose();
          return;
        }
      }

      // 2. Login via Supabase Auth resmi (untuk Administrator atau akun yang terdaftar di auth.users)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (!error && data?.user) {
        let userRole: "admin" | "guru" = isAdminEmail ? "admin" : "guru";
        let userSubject = "Semua Mapel";
        try {
          const { data: prof } = await (supabase.from("profiles") as any)
            .select("role, full_name, subject")
            .eq("id", data.user.id)
            .single();

          if (prof?.role === "admin" || isAdminEmail) {
            userRole = "admin";
          }
          if (prof?.subject) {
            userSubject = prof.subject;
          }
        } catch (err) {
          console.warn("Gagal fetch profile role & subject:", err);
        }

        onSuccess({
          email: data.user.email || cleanEmail,
          name: data.user.user_metadata?.full_name || (isAdminEmail ? "Administrator MIN 1 Ende" : "Guru MIN 1 Ende"),
          role: userRole,
          subject: userSubject,
        });
        onClose();
        return;
      }

      // 3. Fallback cek tabel profiles (misal jika admin mengubah password di tabel profiles)
      const { data: profileUser, error: profileErr } = await (supabase.from("profiles") as any)
        .select("*")
        .ilike("email", cleanEmail)
        .eq("password", password)
        .maybeSingle();

      if (!profileErr && profileUser) {
        onSuccess({
          email: profileUser.email || cleanEmail,
          name: profileUser.full_name || "Guru MIN 1 Ende",
          role: profileUser.role === "admin" || isAdminEmail ? "admin" : "guru",
          subject: profileUser.subject || "Semua Mapel",
        });
        onClose();
        return;
      }

      // Jika tidak ditemukan di database Supabase
      throw new Error("Email atau kata sandi tidak cocok di database Supabase. Silakan periksa kembali.");
    } catch (err: any) {
      console.error("Login error:", err);
      setErrorMsg(err.message || "Gagal masuk. Periksa kembali email dan password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-slate-300 dark:border-slate-700 p-6 sm:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-5">
          <div className="relative w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 p-1.5 border-2 border-emerald-500/30 dark:border-emerald-500/40 shadow-sm flex items-center justify-center shrink-0">
            <Image
              src="/logo/min1ende.webp"
              alt="Logo MIN 1 Ende"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950 dark:text-slate-50">
              Portal Guru & Fasilitator
            </h2>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              MIN 1 Ende • Evaluasi & Bank Soal
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-100 dark:bg-rose-950 border-2 border-rose-300 dark:border-rose-800 flex items-center gap-2 text-xs font-bold text-rose-950 dark:text-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1.5">
              Email Guru
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 dark:text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama.guru@min1ende.sch.id"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-950 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-900 dark:text-slate-100 mb-1.5">
              Kata Sandi
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3 w-4 h-4 text-slate-500 dark:text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-11 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-950 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3.5 top-2.5 p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Memverifikasi..." : "Masuk ke Dashboard Guru"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
