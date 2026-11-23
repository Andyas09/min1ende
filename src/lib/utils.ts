import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Gabungkan kelas Tailwind CSS dengan aman tanpa duplikasi bentrok
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format detik menjadi format menit:detik (MM:SS)
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format angka desimal / nilai ke format Indonesia (e.g. 85,50)
 */
export function formatScore(score: number): string {
  return Number(score).toFixed(1).replace(".", ",");
}

/**
 * Format tanggal ke format lokal Indonesia
 */
export function formatDateIndonesia(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return dateString;
  }
}

