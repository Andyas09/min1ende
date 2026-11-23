"use client";

import React, { useState } from "react";
import { Settings, Clock, Hash, Check, Save } from "lucide-react";

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateRoomCode(localRoomCode.toUpperCase().trim());
    onUpdateTimerLimits(localLimits);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
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
    </div>
  );
}
