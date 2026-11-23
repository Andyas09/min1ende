import { createClient } from "@supabase/supabase-js";
import { Database, Question, QuestionInsert, QuestionUpdate, GameSession, GameSessionInsert, SessionAnswer, SessionAnswerInsert, CognitiveLevel, SubjectItem } from "@/types";
import { INITIAL_QUESTIONS, DEFAULT_SUBJECTS } from "./seed-data";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Cek apakah kredensial Supabase sudah diatur dengan benar dan bukan placeholder
 */
export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes("placeholder-min1ende") &&
    !supabaseAnonKey.includes("placeholder-anon-key") &&
    supabaseUrl.startsWith("http")
  );
};

/**
 * Client Supabase Utama
 */
export const supabase = createClient<Database>(
  supabaseUrl || "https://placeholder-min1ende.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);

// Penyimpanan Lokal InMemory/LocalStorage saat mode demo/kredensial belum diisi
const LOCAL_STORAGE_QUESTIONS_KEY = "sd_match_questions_cache";
const LOCAL_STORAGE_SUBJECTS_KEY = "sd_match_subjects_cache";
const LOCAL_STORAGE_SESSIONS_KEY = "sd_match_sessions_cache";
const LOCAL_STORAGE_ANSWERS_KEY = "sd_match_answers_cache";
const LOCAL_STORAGE_DELETED_SESSIONS_KEY = "sd_match_deleted_sessions";

function getDeletedSessionIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DELETED_SESSIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Gagal membaca deleted sessions:", e);
  }
  return [];
}

function markSessionAsDeleted(sessionId: string) {
  if (typeof window === "undefined") return;
  try {
    const current = getDeletedSessionIds();
    if (!current.includes(sessionId)) {
      current.push(sessionId);
      localStorage.setItem(LOCAL_STORAGE_DELETED_SESSIONS_KEY, JSON.stringify(current));
    }
  } catch (e) {
    console.warn("Gagal menyimpan deleted session:", e);
  }
}

function getLocalSubjects(): SubjectItem[] {
  if (typeof window === "undefined") return DEFAULT_SUBJECTS;
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_SUBJECTS_KEY);
    if (cached) return JSON.parse(cached);
  } catch (e) {
    console.warn("Gagal membaca cache lokal mapel:", e);
  }
  return DEFAULT_SUBJECTS;
}

function saveLocalSubjects(subjects: SubjectItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_SUBJECTS_KEY, JSON.stringify(subjects));
  } catch (e) {
    console.warn("Gagal menyimpan cache lokal mapel:", e);
  }
}

function getLocalQuestions(): Question[] {
  if (typeof window === "undefined") return INITIAL_QUESTIONS;
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_QUESTIONS_KEY);
    if (cached) return JSON.parse(cached);
  } catch (e) {
    console.warn("Gagal membaca cache lokal soal:", e);
  }
  return INITIAL_QUESTIONS;
}

function saveLocalQuestions(questions: Question[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_QUESTIONS_KEY, JSON.stringify(questions));
  } catch (e) {
    console.warn("Gagal menyimpan cache lokal soal:", e);
  }
}

function getLocalSessions(): GameSession[] {
  if (typeof window === "undefined") return [];
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_SESSIONS_KEY);
    if (cached) {
      const parsed: GameSession[] = JSON.parse(cached);
      // Bersihkan sesi hantu (in_progress kosong dengan skor 0)
      return parsed.filter((s) => s.status !== "in_progress" || Number(s.final_score) > 0);
    }
  } catch (e) {
    console.warn("Gagal membaca cache sesi:", e);
  }
  return [];
}

function saveLocalSessions(sessions: GameSession[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.warn("Gagal menyimpan cache sesi:", e);
  }
}

function getLocalAnswers(): SessionAnswer[] {
  if (typeof window === "undefined") return [];
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_ANSWERS_KEY);
    if (cached) return JSON.parse(cached);
  } catch (e) {
    console.warn("Gagal membaca cache jawaban:", e);
  }
  return [];
}

function saveLocalAnswers(answers: SessionAnswer[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_ANSWERS_KEY, JSON.stringify(answers));
  } catch (e) {
    console.warn("Gagal menyimpan cache jawaban:", e);
  }
}

// ==============================================================================
// 1. STORAGE UTILITIES (Upload Gambar Soal & Audio Voice Note)
// ==============================================================================

/**
 * Upload gambar soal/jawaban ke Supabase Storage bucket 'soal-images'
 */
export async function uploadQuestionImage(file: File): Promise<{ url: string | null; error: string | null }> {
  try {
    if (!isSupabaseConfigured()) {
      const localUrl = URL.createObjectURL(file);
      return { url: localUrl, error: null };
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `soal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `questions/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("soal-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("soal-images").getPublicUrl(filePath);
    return { url: data.publicUrl, error: null };
  } catch (err: any) {
    console.error("Error upload gambar soal:", err);
    return { url: null, error: err.message || "Gagal mengunggah gambar" };
  }
}

/**
 * Upload rekaman suara (Voice Note) murid ke Supabase Storage bucket 'argumentasi-audio'
 */
export async function uploadArgumentAudio(
  audioBlob: Blob,
  fileNamePrefix: string = "argumen"
): Promise<{ url: string | null; error: string | null }> {
  try {
    if (!isSupabaseConfigured()) {
      const localUrl = URL.createObjectURL(audioBlob);
      return { url: localUrl, error: null };
    }

    const mimeType = audioBlob.type || "audio/webm";
    const extension = mimeType.includes("wav") ? "wav" : mimeType.includes("mp3") ? "mp3" : "webm";
    const fileName = `${fileNamePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${extension}`;
    const filePath = `voice-notes/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("argumentasi-audio")
      .upload(filePath, audioBlob, {
        contentType: mimeType,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("argumentasi-audio").getPublicUrl(filePath);
    return { url: data.publicUrl, error: null };
  } catch (err: any) {
    console.error("Error upload audio argumentasi:", err);
    return { url: null, error: err.message || "Gagal mengunggah rekaman suara" };
  }
}

// ==============================================================================
// 1.5. MATA PELAJARAN & MATERI (CRUD OPERATIONS)
// ==============================================================================

/**
 * Ambil semua daftar mata pelajaran & materi
 */
export async function getSubjects(): Promise<SubjectItem[]> {
  if (!isSupabaseConfigured()) {
    return getLocalSubjects();
  }

  try {
    const { data, error } = await (supabase.from("subjects") as any)
      .select("*")
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) {
      return getLocalSubjects();
    }
    return data as SubjectItem[];
  } catch (err) {
    console.warn("Gagal query subjects dari Supabase, gunakan local cache:", err);
    return getLocalSubjects();
  }
}

/**
 * Tambah mata pelajaran baru
 */
export async function createSubject(item: { name: string; icon?: string; description?: string; topics?: string[] }): Promise<SubjectItem> {
  const newSubject: SubjectItem = {
    id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: item.name,
    icon: item.icon || "📚",
    description: item.description || "",
    topics: item.topics && item.topics.length > 0 ? item.topics : [`Semua Materi ${item.name}`],
    created_at: new Date().toISOString(),
  };

  const list = getLocalSubjects();
  const updated = [...list, newSubject];
  saveLocalSubjects(updated);

  if (!isSupabaseConfigured()) {
    return newSubject;
  }

  try {
    const { data, error } = await (supabase.from("subjects") as any)
      .insert([newSubject])
      .select()
      .single();

    if (!error && data) return data as SubjectItem;
  } catch (err) {
    console.warn("Gagal insert subject ke Supabase:", err);
  }
  return newSubject;
}

/**
 * Perbarui mata pelajaran (nama, ikon, materi/topics)
 */
export async function updateSubject(id: string, updates: Partial<SubjectItem>): Promise<SubjectItem | null> {
  const list = getLocalSubjects();
  const idx = list.findIndex((s) => s.id === id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...updates };
    saveLocalSubjects(list);
  }

  if (!isSupabaseConfigured()) {
    return idx !== -1 ? list[idx] : null;
  }

  try {
    const { data, error } = await (supabase.from("subjects") as any)
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (!error && data) return data as SubjectItem;
  } catch (err) {
    console.warn("Gagal update subject ke Supabase:", err);
  }
  return idx !== -1 ? list[idx] : null;
}

/**
 * Hapus mata pelajaran
 */
export async function deleteSubject(id: string): Promise<boolean> {
  const list = getLocalSubjects();
  const filtered = list.filter((s) => s.id !== id);
  saveLocalSubjects(filtered);

  if (!isSupabaseConfigured()) {
    return true;
  }

  try {
    await (supabase.from("subjects") as any).delete().eq("id", id);
    return true;
  } catch (err) {
    console.warn("Gagal delete subject di Supabase:", err);
    return true;
  }
}

// ==============================================================================
// 2. BANK SOAL (CRUD OPERATIONS)
// ==============================================================================

export interface QuestionFilterOptions {
  difficulty?: CognitiveLevel | "ALL";
  subject?: string;
  topic?: string;
}

/**
 * Ambil daftar soal terfilter (mata pelajaran, materi, tingkat kognitif)
 */
export async function getFilteredQuestions(options?: QuestionFilterOptions): Promise<Question[]> {
  const { difficulty, subject, topic } = options || {};

  const matchFilter = (q: Question) => {
    if (!q.is_active) return false;
    if (difficulty && difficulty !== "ALL" && q.difficulty_level !== difficulty) return false;
    if (subject && subject !== "ALL" && !q.subject.toLowerCase().includes(subject.toLowerCase())) return false;
    if (topic && topic !== "ALL" && !topic.startsWith("Semua Materi") && q.topic && !q.topic.toLowerCase().includes(topic.toLowerCase())) return false;
    return true;
  };

  if (!isSupabaseConfigured()) {
    const list = getLocalQuestions();
    const filtered = list.filter(matchFilter);
    // Jika filter terlalu ketat dan tidak menemukan soal, fallback ke soal tingkat kesulitan atau seluruh soal
    return filtered.length > 0 ? filtered : list.filter((q) => !difficulty || difficulty === "ALL" || q.difficulty_level === difficulty);
  }

  try {
    let query = supabase
      .from("questions")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (difficulty && difficulty !== "ALL") {
      query = query.eq("difficulty_level", difficulty);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) {
      const list = INITIAL_QUESTIONS.filter(matchFilter);
      return list.length > 0 ? list : INITIAL_QUESTIONS.filter((q) => !difficulty || difficulty === "ALL" || q.difficulty_level === difficulty);
    }

    const filtered = (data as Question[]).filter(matchFilter);
    return filtered.length > 0 ? filtered : (data as Question[]);
  } catch (err) {
    console.warn("Gagal query Supabase questions, fallback ke data lokal:", err);
    const list = getLocalQuestions();
    const filtered = list.filter(matchFilter);
    return filtered.length > 0 ? filtered : list.filter((q) => !difficulty || difficulty === "ALL" || q.difficulty_level === difficulty);
  }
}

/**
 * Ambil daftar soal (bisa difilter berdasarkan tingkat kesulitan)
 */
export async function getQuestions(difficulty?: CognitiveLevel): Promise<Question[]> {
  if (!isSupabaseConfigured()) {
    const list = getLocalQuestions();
    return difficulty ? list.filter((q) => q.difficulty_level === difficulty && q.is_active) : list;
  }

  try {
    let query = supabase
      .from("questions")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (difficulty) {
      query = query.eq("difficulty_level", difficulty);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) {
      return INITIAL_QUESTIONS.filter((q) => !difficulty || q.difficulty_level === difficulty);
    }
    return data as Question[];
  } catch (err) {
    console.warn("Gagal query Supabase questions, fallback ke data lokal:", err);
    const list = getLocalQuestions();
    return difficulty ? list.filter((q) => q.difficulty_level === difficulty && q.is_active) : list;
  }
}

/**
 * Ambil semua soal untuk guru (termasuk non-aktif)
 */
export async function getAllQuestionsForTeacher(): Promise<Question[]> {
  if (!isSupabaseConfigured()) {
    return getLocalQuestions();
  }

  try {
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as Question[];
  } catch (err) {
    console.warn("Gagal query questions guru, gunakan local cache:", err);
    return getLocalQuestions();
  }
}

/**
 * Tambah soal baru
 */
export async function createQuestion(item: QuestionInsert): Promise<Question> {
  const newQuestion: Question = {
    id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ...item,
    is_active: item.is_active ?? true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) {
    const questions = getLocalQuestions();
    const updated = [newQuestion, ...questions];
    saveLocalQuestions(updated);
    return newQuestion;
  }

  try {
    const { data, error } = await (supabase.from("questions") as any)
      .insert([item])
      .select()
      .single();

    if (error) throw error;
    return data as Question;
  } catch (err) {
    console.warn("Gagal insert Supabase questions, simpan ke lokal:", err);
    const questions = getLocalQuestions();
    const updated = [newQuestion, ...questions];
    saveLocalQuestions(updated);
    return newQuestion;
  }
}

/**
 * Perbarui soal yang ada
 */
export async function updateQuestion(id: string, updates: QuestionUpdate): Promise<Question | null> {
  if (!isSupabaseConfigured()) {
    const questions = getLocalQuestions();
    const index = questions.findIndex((q) => q.id === id);
    if (index === -1) return null;
    questions[index] = { ...questions[index], ...updates, updated_at: new Date().toISOString() };
    saveLocalQuestions(questions);
    return questions[index];
  }

  try {
    const { data, error } = await (supabase.from("questions") as any)
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Question;
  } catch (err) {
    console.warn("Gagal update soal di Supabase, fallback lokal:", err);
    return null;
  }
}

/**
 * Hapus soal
 */
export async function deleteQuestion(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    const questions = getLocalQuestions();
    const filtered = questions.filter((q) => q.id !== id);
    saveLocalQuestions(filtered);
    return true;
  }

  try {
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Gagal hapus soal di Supabase:", err);
    return false;
  }
}

// ==============================================================================
// 3. GAME SESSIONS & ASSESSMENT REPORTS
// ==============================================================================

/**
 * Cek apakah string merupakan UUID valid (format PostgreSQL)
 */
function isValidUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Buat sesi game baru untuk murid
 */
export async function createGameSession(sessionData: GameSessionInsert): Promise<GameSession> {
  const newSession: GameSession = {
    id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    room_code: sessionData.room_code || "MIN1-ENDE",
    student_name: sessionData.student_name,
    student_class: sessionData.student_class,
    player_mode: sessionData.player_mode || "individual",
    group_members: sessionData.group_members || "",
    subject: sessionData.subject || "Semua Mapel",
    topic: sessionData.topic || "Semua Materi",
    student_id: sessionData.student_id || null,
    difficulty_level: sessionData.difficulty_level,
    total_questions: sessionData.total_questions,
    correct_answers: sessionData.correct_answers || 0,
    time_limit_seconds: sessionData.time_limit_seconds || 300,
    time_spent_seconds: sessionData.time_spent_seconds || 0,
    score_pairing: sessionData.score_pairing || 0,
    score_argumentation: sessionData.score_argumentation || 0,
    score_activity: sessionData.score_activity || 0,
    score_time: sessionData.score_time || 0,
    final_score: sessionData.final_score || 0,
    status: sessionData.status || "in_progress",
    created_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) {
    const sessions = getLocalSessions();
    saveLocalSessions([newSession, ...sessions]);
    return newSession;
  }

  try {
    // 1. Coba insert dengan seluruh data (jika kolom baru sudah ada di Supabase)
    const { data, error } = await (supabase.from("game_sessions") as any)
      .insert([sessionData])
      .select()
      .single();

    if (!error && data) {
      const created: GameSession = {
        ...newSession,
        ...data,
      };
      const sessions = getLocalSessions();
      saveLocalSessions([created, ...sessions]);
      return created;
    }

    // 2. Jika gagal karena kolom baru (player_mode / subject / topic) belum ada di skema SQL Supabase,
    // gunakan kolom dasar yang pasti ada di database PostgreSQL
    const basePayload: any = {
      room_code: sessionData.room_code || "MIN1-ENDE",
      student_name: sessionData.student_name,
      student_class: sessionData.student_class,
      student_id: sessionData.student_id || null,
      difficulty_level: sessionData.difficulty_level,
      total_questions: sessionData.total_questions,
      time_limit_seconds: sessionData.time_limit_seconds || 300,
      status: sessionData.status || "in_progress",
    };

    const { data: baseData, error: baseError } = await (supabase.from("game_sessions") as any)
      .insert([basePayload])
      .select()
      .single();

    if (baseError) throw baseError;

    const created: GameSession = {
      ...newSession,
      ...baseData,
      player_mode: sessionData.player_mode,
      group_members: sessionData.group_members,
      subject: sessionData.subject,
      topic: sessionData.topic,
    };
    const sessions = getLocalSessions();
    saveLocalSessions([created, ...sessions]);
    return created;
  } catch (err) {
    console.warn("Gagal create game_sessions di Supabase, fallback lokal:", err);
    const sessions = getLocalSessions();
    saveLocalSessions([newSession, ...sessions]);
    return newSession;
  }
}

/**
 * Perbarui sesi game (hasil akhir skor / status)
 */
export async function updateGameSession(
  sessionId: string,
  updates: Partial<GameSession>
): Promise<GameSession | null> {
  const isUUID = isValidUUID(sessionId);

  // Jika bukan UUID valid atau Supabase tidak aktif, langsung perbarui di local storage
  if (!isSupabaseConfigured() || !isUUID) {
    const sessions = getLocalSessions();
    const idx = sessions.findIndex((s) => s.id === sessionId);
    if (idx !== -1) {
      sessions[idx] = { ...sessions[idx], ...updates };
      saveLocalSessions(sessions);
      return sessions[idx];
    }
    const fallback: GameSession = {
      id: sessionId,
      room_code: "MIN1-ENDE",
      student_name: "Murid",
      student_class: "5A",
      difficulty_level: "Easy",
      total_questions: 4,
      correct_answers: 0,
      time_limit_seconds: 300,
      time_spent_seconds: 0,
      score_pairing: 0,
      score_argumentation: 0,
      score_activity: 0,
      score_time: 0,
      final_score: 0,
      status: "completed",
      created_at: new Date().toISOString(),
      ...updates,
    };
    saveLocalSessions([fallback, ...sessions]);
    return fallback;
  }

  // Jika UUID valid, perbarui di Supabase PostgreSQL
  try {
    const allowedKeys = [
      "correct_answers",
      "time_spent_seconds",
      "score_pairing",
      "score_argumentation",
      "score_activity",
      "score_time",
      "final_score",
      "status",
      "teacher_feedback",
      "reviewed_by",
      "reviewed_at",
      "completed_at",
    ];
    const sanitizedUpdates: Record<string, any> = {};
    for (const key of Object.keys(updates)) {
      if (allowedKeys.includes(key)) {
        sanitizedUpdates[key] = (updates as any)[key];
      }
    }

    const { data, error } = await (supabase.from("game_sessions") as any)
      .update(sanitizedUpdates)
      .eq("id", sessionId)
      .select();

    if (error) throw error;

    let updatedSession: GameSession;
    if (data && data.length > 0) {
      updatedSession = { ...data[0], ...updates } as GameSession;
    } else {
      updatedSession = { id: sessionId, ...updates } as any;
    }

    // Selalu sinkronkan cache sesi lokal
    const sessions = getLocalSessions();
    const idx = sessions.findIndex((s) => s.id === sessionId);
    if (idx !== -1) {
      sessions[idx] = { ...sessions[idx], ...updatedSession };
      saveLocalSessions(sessions);
    }
    return updatedSession;
  } catch (err) {
    console.warn("Gagal update game_sessions di Supabase, fallback lokal:", err);
    // Selalu fallback ke update lokal agar game murid tetap berjalan mulus
    const sessions = getLocalSessions();
    const idx = sessions.findIndex((s) => s.id === sessionId);
    if (idx !== -1) {
      sessions[idx] = { ...sessions[idx], ...updates };
      saveLocalSessions(sessions);
      return sessions[idx];
    }
    return { id: sessionId, ...updates } as any;
  }
}

/**
 * Hapus sesi game dari riwayat (baik di Supabase maupun LocalStorage)
 */
export async function deleteGameSession(sessionId: string): Promise<boolean> {
  // 1. Selalu catat di daftar deleted sessions dan bersihkan dari cache LocalStorage
  markSessionAsDeleted(sessionId);

  const sessions = getLocalSessions();
  const filteredSessions = sessions.filter((s) => s.id !== sessionId);
  saveLocalSessions(filteredSessions);

  const answers = getLocalAnswers();
  const filteredAnswers = answers.filter((a) => a.session_id !== sessionId);
  saveLocalAnswers(filteredAnswers);

  const isUUID = isValidUUID(sessionId);

  // Jika Supabase tidak aktif atau bukan UUID valid, penghapusan lokal sudah cukup
  if (!isSupabaseConfigured() || !isUUID) {
    return true;
  }

  // 2. Jika UUID valid dan Supabase aktif, hapus dari PostgreSQL Supabase
  try {
    await (supabase.from("session_answers") as any).delete().eq("session_id", sessionId);
    const { error } = await supabase.from("game_sessions").delete().eq("id", sessionId);
    if (error) {
      console.warn("Catatan hapus game_sessions Supabase (RLS atau batasan):", error.message);
    }
    return true;
  } catch (err) {
    console.warn("Error saat menghapus game_sessions Supabase:", err);
    return true;
  }
}

/**
 * Simpan detail jawaban & argumentasi per kartu
 */
export async function saveSessionAnswer(answerData: SessionAnswerInsert): Promise<SessionAnswer> {
  const newAnswer: SessionAnswer = {
    id: `ans_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ...answerData,
    argument_score: answerData.argument_score ?? 70,
    submitted_at: new Date().toISOString(),
  };

  const canSendToSupabase =
    isSupabaseConfigured() &&
    isValidUUID(answerData.session_id) &&
    isValidUUID(answerData.question_id);

  if (!canSendToSupabase) {
    const answers = getLocalAnswers();
    saveLocalAnswers([newAnswer, ...answers]);
    return newAnswer;
  }

  try {
    const { data, error } = await (supabase.from("session_answers") as any)
      .insert([answerData])
      .select()
      .single();

    if (error) throw error;
    return data as SessionAnswer;
  } catch (err) {
    console.warn("Gagal simpan session_answers di Supabase, fallback lokal:", err);
    const answers = getLocalAnswers();
    saveLocalAnswers([newAnswer, ...answers]);
    return newAnswer;
  }
}

/**
 * Ambil daftar semua sesi game (Assessment Report) beserta detail jawaban
 */
export async function getGameSessionsReport(): Promise<GameSession[]> {
  const deletedIds = getDeletedSessionIds();

  if (!isSupabaseConfigured()) {
    const sessions = getLocalSessions();
    const answers = getLocalAnswers();
    const questions = getLocalQuestions();

    const mapped = sessions
      .filter((s) => !deletedIds.includes(s.id))
      .map((s) => ({
        ...s,
        answers: answers
          .filter((a) => a.session_id === s.id)
          .map((a) => ({
            ...a,
            question: questions.find((q) => q.id === a.question_id),
          })),
      }));

    // Saring sesi hantu (in_progress kosong tanpa jawaban)
    return mapped.filter(
      (s) => s.status !== "in_progress" || (s.answers && s.answers.length > 0) || Number(s.final_score) > 0
    );
  }

  try {
    const { data, error } = await supabase
      .from("game_sessions")
      .select(`
        *,
        answers:session_answers (
          *,
          question:questions (*)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Filter agar sesi kosong tanpa jawaban serta sesi yang sudah dihapus tidak muncul
    const list = (data || []) as GameSession[];
    return list.filter(
      (s) =>
        !deletedIds.includes(s.id) &&
        (s.status !== "in_progress" || (s.answers && s.answers.length > 0) || Number(s.final_score) > 0)
    );
  } catch (err) {
    console.warn("Gagal query assessment report di Supabase, fallback lokal:", err);
    const sessions = getLocalSessions();
    return sessions.filter((s) => !deletedIds.includes(s.id));
  }
}

/**
 * Perbarui nilai kualitas argumentasi oleh Guru
 */
export async function updateArgumentScore(
  answerId: string,
  newScore: number,
  comment?: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    const answers = getLocalAnswers();
    const idx = answers.findIndex((a) => a.id === answerId);
    if (idx !== -1) {
      answers[idx].argument_score = newScore;
      if (comment !== undefined) answers[idx].teacher_comment = comment;
      saveLocalAnswers(answers);
      return true;
    }
    return false;
  }

  try {
    const payload: any = { argument_score: newScore };
    if (comment !== undefined) payload.teacher_comment = comment;

    const { error } = await (supabase.from("session_answers") as any)
      .update(payload)
      .eq("id", answerId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Gagal update skor argumentasi:", err);
    return false;
  }
}
