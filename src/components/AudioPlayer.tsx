"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { formatTime } from "@/lib/utils";

interface AudioPlayerProps {
  src: string;
  title?: string;
  className?: string;
}

export function AudioPlayer({ src, title = "Rekaman Suara", className = "" }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (!isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("durationchange", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("durationchange", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => console.warn("Audio play blocked:", err));
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const restartAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    audioRef.current.play().catch(() => {});
    setIsPlaying(true);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <div className={`flex flex-col gap-2 p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/95 border-2 border-slate-300 dark:border-slate-700 ${className}`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
        <span className="truncate max-w-[200px] flex items-center gap-1.5 font-black text-slate-950 dark:text-slate-50">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          {title}
        </span>
        <span className="tabular-nums font-mono font-bold text-slate-900 dark:text-slate-100">
          {formatTime(Math.floor(currentTime))} / {formatTime(Math.floor(duration || 0))}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-95 transition-transform cursor-pointer"
          title={isPlaying ? "Jeda" : "Putar Audio"}
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
        </button>

        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-2 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
        />

        <button
          type="button"
          onClick={restartAudio}
          className="p-2 text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white active:scale-90 transition-transform cursor-pointer"
          title="Ulangi dari awal"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={toggleMute}
          className="p-2 text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white active:scale-90 transition-transform cursor-pointer"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
