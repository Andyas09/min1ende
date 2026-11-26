/**
 * SD MATCH (Smart Digital Make A Match) - MIN 1 ENDE
 * Definisi Tipe Logika Game & Interaksi Kartu
 */

import { CognitiveLevel, Question, PlayerMode, Semester } from './database';

export type CardType = 'question' | 'answer';

export interface GameCard {
  id: string;              // Unique ID per kartu di arena
  questionId: string;      // ID relasi ke pertanyaan asli
  type: CardType;          // Kartu soal atau kartu jawaban
  content: string;         // Teks pertanyaan atau teks jawaban
  imageUrl?: string | null;// Gambar kartu (opsional)
  isSelected: boolean;     // Apakah sedang dipilih murid
  isMatched: boolean;      // Apakah sudah berhasil dicocokkan
  isLocked: boolean;       // Sedang dalam proses verifikasi / modal
}

export interface ActivePair {
  questionCard: GameCard;
  answerCard: GameCard;
}

export interface ArgumentSubmission {
  type: 'voice' | 'text';
  text?: string;
  transcript?: string;     // Transkrip otomatis dari voice note (Web Speech API)
  audioBlob?: Blob;
  audioDurationSeconds?: number;
  audioUrl?: string;
}

export interface VerificationFeedback {
  isCorrect: boolean;
  questionText: string;
  chosenAnswerText: string;
  correctAnswerText: string;
  explanation: string;
  argumentType: 'voice' | 'text';
  argumentContent: string;
  audioUrl?: string;
  isGameOver?: boolean;
  // Hasil pengecekan kata kunci argumentasi: true = sesuai, false = tidak sesuai, null = menunggu penilaian guru
  argumentValid?: boolean | null;
  matchedKeywords?: string[];
}

export interface ScoreWeights {
  pairing: number;        // 40%
  argumentation: number;  // 30%
  activity: number;       // 20%
  time: number;           // 10%
}

export interface ScoreBreakdown {
  scorePairing: number;
  scoreArgumentation: number;
  scoreActivity: number;
  scoreTime: number;
  finalScore: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpentSeconds: number;
  timeLimitSeconds: number;
}

export interface StudentRegistration {
  playerMode: PlayerMode;
  studentName: string;
  groupMembers?: string;
  studentClass: string;
  roomCode: string;
  subject: string;
  topic: string;
  semester?: Semester | 'ALL';
  cardPairsCount: number;
  timeLimitSeconds: number;
  difficultyLevel: CognitiveLevel;
}

export interface BloomLevelInfo {
  level: CognitiveLevel;
  title: string;
  bloomTaxonomy: string;
  description: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  cardBorder: string;
  iconName: string;
  recommendedTime: number; // detik
}
