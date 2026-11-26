import { createClient } from "@supabase/supabase-js";
import {
  Database,
  Question,
  QuestionInsert,
  QuestionUpdate,
  GameSession,
  GameSessionInsert,
  SessionAnswer,
  SessionAnswerInsert,
  CognitiveLevel,
  SubjectItem,
  ClassItem,
  Semester,
} from "@/types";
import { DEFAULT_SUBJECTS } from "./seed-data";
import { subjectMatches, shuffleArray } from "./game-engine";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Cek apakah kredensial Supabase sudah diatur dengan benar
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

/**
 * Bersihkan seluruh sisa cache data lama di browser (localStorage)
 */
export function clearBrowserDataCache(): void {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove = [
      "sd_match_teachers_cache",
      "sd_match_questions_cache",
      "sd_match_subjects_cache",
      "sd_match_sessions_cache",
      "sd_match_answers_cache",
      "sd_match_deleted_sessions",
    ];
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
  } catch (e) {
    console.warn("Gagal membersihkan cache lokal browser:", e);
  }
}

/**
 * Deteksi error Supabase karena tabel/kolom belum dibuat (migrasi belum dijalankan)
 */
function isSchemaMissingError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || "");
  const msg = String(err.message || "").toLowerCase();
  return (
    code === "PGRST204" ||
    code === "PGRST205" ||
    code === "42703" ||
    code === "42P01" ||
    msg.includes("schema cache") ||
    msg.includes("does not exist")
  );
}

/**
 * Pesan error yang ramah untuk guru
 */
function friendlyDbError(err: any, fallback: string): Error {
  const msg = String(err?.message || "");
  if (String(err?.code) === "42501" || msg.toLowerCase().includes("row-level security")) {
    return new Error(
      "Database Supabase menolak penyimpanan (Row Level Security). Jalankan file migrasi supabase/migrations/20261127_revisi_soal_kelas.sql di Supabase SQL Editor."
    );
  }
  if (isSchemaMissingError(err)) {
    return new Error(
      "Tabel/kolom di database Supabase belum lengkap. Jalankan file migrasi supabase/migrations/20261127_revisi_soal_kelas.sql di Supabase SQL Editor."
    );
  }
  return new Error(msg || fallback);
}

/**
 * Generate UUID v4 standar yang valid untuk PostgreSQL
 */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isValidUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

export interface TeacherAccount {
  id: string;
  full_name: string;
  email: string;
  password?: string;
  subject?: string;
  role: "admin" | "guru";
  school: string;
  created_at: string;
}

// ==============================================================================
// 1. MANAJEMEN GURU (Langsung ke tabel Supabase 'profiles' - Tanpa Cache)
// ==============================================================================

/**
 * Ambil daftar semua guru langsung dari database Supabase (profiles)
 */
export async function getTeachersList(): Promise<TeacherAccount[]> {
  try {
    const { data, error } = await (supabase.from("profiles") as any)
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;
    if (!data) return [];

    return data.map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email || "",
      password: p.password || "",
      subject: p.subject || "Semua Mapel",
      role: p.email?.toLowerCase() === "admin@min1ende.com" ? "admin" : p.role || "guru",
      school: p.school || "MIN 1 Ende",
      created_at: p.created_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.error("Gagal mengambil data guru dari Supabase:", err);
    return [];
  }
}

/**
 * Tambah akun guru baru langsung ke database Supabase (profiles)
 */
export async function createTeacherAccount(data: {
  full_name: string;
  email: string;
  school?: string;
  subject?: string;
  password?: string;
  role: "admin" | "guru";
}): Promise<TeacherAccount> {
  const generatedId = generateUUID();

  const newAccount: TeacherAccount = {
    id: generatedId,
    full_name: data.full_name,
    email: data.email.toLowerCase().trim(),
    password: data.password || "min1ende123",
    subject: data.subject || "Semua Mapel",
    role: data.role,
    school: data.school?.trim() || "MIN 1 Ende",
    created_at: new Date().toISOString(),
  };

  try {
    const { data: insertData, error: insertError } = await (supabase.from("profiles") as any)
      .insert([
        {
          id: generatedId,
          full_name: newAccount.full_name,
          email: newAccount.email,
          password: newAccount.password,
          subject: newAccount.subject,
          role: newAccount.role,
          school: newAccount.school,
        },
      ])
      .select()
      .single();

    if (insertError) {
      // Coba jika ada batasan id foreign key
      const { data: retryData, error: retryError } = await (supabase.from("profiles") as any)
        .insert([
          {
            full_name: newAccount.full_name,
            email: newAccount.email,
            password: newAccount.password,
            subject: newAccount.subject,
            role: newAccount.role,
            school: newAccount.school,
          },
        ])
        .select()
        .single();

      if (retryError) throw retryError;
      if (retryData) return retryData as TeacherAccount;
    }

    if (insertData) return insertData as TeacherAccount;
  } catch (err: any) {
    console.error("Gagal menyimpan akun guru ke Supabase:", err);
    throw new Error(err.message || "Gagal menyimpan akun guru ke database Supabase.");
  }

  return newAccount;
}

/**
 * Update akun guru langsung di database Supabase (profiles)
 */
export async function updateTeacherAccount(
  id: string,
  updates: Partial<TeacherAccount>
): Promise<TeacherAccount | null> {
  try {
    const { data, error } = await (supabase.from("profiles") as any)
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (updates.email) {
        const { data: emailData, error: emailErr } = await (supabase.from("profiles") as any)
          .update(updates)
          .ilike("email", updates.email)
          .select()
          .single();
        if (!emailErr && emailData) return emailData as TeacherAccount;
      }
      throw error;
    }

    return (data as TeacherAccount) || null;
  } catch (err: any) {
    console.error("Gagal update profile di Supabase:", err);
    throw new Error(err.message || "Gagal update profile di database Supabase.");
  }
}

/**
 * Hapus akun guru langsung di database Supabase (profiles)
 */
export async function deleteTeacherAccount(id: string): Promise<boolean> {
  try {
    const { error } = await (supabase.from("profiles") as any)
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Gagal hapus profile di Supabase:", err);
    return false;
  }
}

// ==============================================================================
// 2. STORAGE UTILITIES (Upload Gambar & Rekaman Suara)
// ==============================================================================

export async function uploadQuestionImage(file: File): Promise<{ url: string | null; error: string | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { url: URL.createObjectURL(file), error: null };
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `soal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `questions/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("soal-images")
      .upload(filePath, file, { cacheControl: "3600", upsert: false });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("soal-images").getPublicUrl(filePath);
    return { url: data.publicUrl, error: null };
  } catch (err: any) {
    console.error("Error upload gambar soal:", err);
    return { url: null, error: err.message || "Gagal mengunggah gambar" };
  }
}

export async function uploadArgumentAudio(
  audioBlob: Blob,
  fileNamePrefix: string = "argumen"
): Promise<{ url: string | null; error: string | null }> {
  try {
    if (!isSupabaseConfigured()) {
      return { url: URL.createObjectURL(audioBlob), error: null };
    }

    const mimeType = audioBlob.type || "audio/webm";
    const extension = mimeType.includes("wav") ? "wav" : mimeType.includes("mp3") ? "mp3" : "webm";
    const fileName = `${fileNamePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${extension}`;
    const filePath = `voice-notes/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("argumentasi-audio")
      .upload(filePath, audioBlob, { contentType: mimeType, cacheControl: "3600", upsert: false });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("argumentasi-audio").getPublicUrl(filePath);
    return { url: data.publicUrl, error: null };
  } catch (err: any) {
    console.error("Error upload audio argumentasi:", err);
    return { url: null, error: err.message || "Gagal mengunggah rekaman suara" };
  }
}

// ==============================================================================
// 3. MATA PELAJARAN (Tabel Supabase 'subjects')
// ==============================================================================

function slugId(prefix: string, name: string): string {
  return `${prefix}_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}_${Math.random()
    .toString(36)
    .substring(2, 6)}`;
}

/**
 * Ambil daftar mata pelajaran dari tabel `subjects`.
 * Mapel yang hanya ada di bank soal (belum terdaftar) tetap ditampilkan agar soalnya bisa dimainkan.
 */
export async function getSubjects(): Promise<SubjectItem[]> {
  let base: SubjectItem[] = DEFAULT_SUBJECTS;
  try {
    const { data, error } = await (supabase.from("subjects") as any)
      .select("*")
      .order("created_at", { ascending: true });
    if (!error && data && data.length > 0) {
      base = (data as any[]).map((s) => ({
        id: s.id,
        name: s.name,
        icon: s.icon || "📚",
        description: s.description || "",
        topics: Array.isArray(s.topics) && s.topics.length > 0 ? s.topics : [`Semua Materi ${s.name}`],
        topics_semester_2: Array.isArray(s.topics_semester_2) ? s.topics_semester_2 : [],
        created_at: s.created_at,
      }));
    }
  } catch (err) {
    console.warn("Tabel subjects belum tersedia, gunakan daftar bawaan:", err);
  }

  try {
    const { data } = await supabase.from("questions").select("subject");
    const dbSubjects = Array.from(new Set((data || []).map((q: any) => q.subject).filter(Boolean))) as string[];
    const merged = [...base];
    for (const sub of dbSubjects) {
      if (!merged.some((m) => subjectMatches(m.name, sub))) {
        merged.push({
          id: `sub_q_${sub.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
          name: sub,
          icon: "📚",
          description: `Mata Pelajaran ${sub}`,
          topics: [`Semua Materi ${sub}`],
        });
      }
    }
    return merged;
  } catch {
    return base;
  }
}

export async function createSubject(item: {
  name: string;
  icon?: string;
  description?: string;
  topics?: string[];
  topics_semester_2?: string[];
}): Promise<SubjectItem> {
  const payload: any = {
    id: slugId("sub", item.name),
    name: item.name.trim(),
    icon: item.icon || "📚",
    description: item.description || "",
    topics: item.topics && item.topics.length > 0 ? item.topics : [`Semua Materi ${item.name}`],
    topics_semester_2: item.topics_semester_2 || [],
  };
  let { data, error } = await (supabase.from("subjects") as any).insert([payload]).select().single();
  if (error && isSchemaMissingError(error)) {
    const { topics_semester_2: _ignored, ...basePayload } = payload;
    ({ data, error } = await (supabase.from("subjects") as any).insert([basePayload]).select().single());
  }
  if (error) throw friendlyDbError(error, "Gagal menyimpan mata pelajaran.");
  return {
    ...(data as SubjectItem),
    topics_semester_2: (data as any).topics_semester_2 || item.topics_semester_2 || [],
  };
}

export async function updateSubject(id: string, updates: Partial<SubjectItem>): Promise<SubjectItem | null> {
  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.icon !== undefined) payload.icon = updates.icon;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.topics !== undefined) payload.topics = updates.topics;
  if (updates.topics_semester_2 !== undefined) payload.topics_semester_2 = updates.topics_semester_2;

  let { data, error } = await (supabase.from("subjects") as any)
    .update(payload)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error && isSchemaMissingError(error)) {
    const { topics_semester_2: _ignored, ...basePayload } = payload;
    ({ data, error } = await (supabase.from("subjects") as any)
      .update(basePayload)
      .eq("id", id)
      .select()
      .maybeSingle());
  }

  if (error) throw friendlyDbError(error, "Gagal memperbarui mata pelajaran.");
  if (!data) {
    // Mapel bawaan yang belum tersimpan di tabel: simpan sebagai baris baru
    const fallback = DEFAULT_SUBJECTS.find((s) => s.id === id);
    if (fallback) {
      const row: any = { ...fallback, ...payload, id };
      let { data: ins, error: insErr } = await (supabase.from("subjects") as any)
        .insert([{
          id: row.id,
          name: row.name,
          icon: row.icon,
          description: row.description,
          topics: row.topics,
          topics_semester_2: row.topics_semester_2 || [],
        }])
        .select()
        .single();
      if (insErr && isSchemaMissingError(insErr)) {
        ({ data: ins, error: insErr } = await (supabase.from("subjects") as any)
          .insert([{ id: row.id, name: row.name, icon: row.icon, description: row.description, topics: row.topics }])
          .select()
          .single());
      }
      if (insErr) throw friendlyDbError(insErr, "Gagal memperbarui mata pelajaran.");
      return {
        ...(ins as SubjectItem),
        topics_semester_2: (ins as any).topics_semester_2 || row.topics_semester_2 || [],
      };
    }
  }
  return data
    ? {
        ...(data as SubjectItem),
        topics_semester_2: (data as any).topics_semester_2 ?? updates.topics_semester_2 ?? [],
      }
    : null;
}

export async function deleteSubject(id: string): Promise<boolean> {
  const { error } = await (supabase.from("subjects") as any).delete().eq("id", id);
  if (error) throw friendlyDbError(error, "Gagal menghapus mata pelajaran.");
  return true;
}

// ==============================================================================
// 3b. KELAS (Tabel Supabase 'classes') - dikelola dari Dashboard Guru
// ==============================================================================

export const DEFAULT_CLASSES: ClassItem[] = ["4A", "4B", "5A", "5B", "6A", "6B"].map((n) => ({
  id: `default_${n}`,
  name: n,
  description: "",
}));

/**
 * Ambil daftar kelas. Bila tabel `classes` belum dibuat, gunakan daftar bawaan.
 */
export async function getClasses(): Promise<{ classes: ClassItem[]; fromDatabase: boolean }> {
  try {
    const { data, error } = await (supabase.from("classes") as any)
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return { classes: (data || []) as ClassItem[], fromDatabase: true };
  } catch (err) {
    console.warn("Tabel classes belum tersedia, gunakan daftar bawaan:", err);
    return { classes: DEFAULT_CLASSES, fromDatabase: false };
  }
}

export async function createClass(item: { name: string; description?: string }): Promise<ClassItem> {
  const { data, error } = await (supabase.from("classes") as any)
    .insert([{ name: item.name.trim(), description: item.description?.trim() || "" }])
    .select()
    .single();
  if (error) {
    if (String(error.code) === "23505") throw new Error(`Kelas "${item.name}" sudah ada.`);
    throw friendlyDbError(error, "Gagal menambah kelas.");
  }
  return data as ClassItem;
}

export async function updateClass(id: string, updates: { name?: string; description?: string }): Promise<ClassItem> {
  const { data, error } = await (supabase.from("classes") as any)
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    if (String(error.code) === "23505") throw new Error(`Kelas "${updates.name}" sudah ada.`);
    throw friendlyDbError(error, "Gagal memperbarui kelas.");
  }
  return data as ClassItem;
}

export async function deleteClass(id: string): Promise<boolean> {
  const { error } = await (supabase.from("classes") as any).delete().eq("id", id);
  if (error) throw friendlyDbError(error, "Gagal menghapus kelas.");
  return true;
}

// ==============================================================================
// 4. BANK SOAL (Tabel Supabase 'questions')
// ==============================================================================

export interface QuestionFilterOptions {
  difficulty?: CognitiveLevel | "ALL";
  subject?: string;
  topic?: string;
  semester?: Semester | "ALL";
}

function topicMatches(qTopic: string | undefined | null, selected?: string): boolean {
  if (!selected || selected === "ALL" || selected.startsWith("Semua Materi")) return true;
  if (!qTopic) return true; // soal tanpa topik tetap ikut
  return qTopic.toLowerCase().includes(selected.toLowerCase()) || selected.toLowerCase().includes(qTopic.toLowerCase());
}

/**
 * Ambil soal aktif untuk permainan murid (diacak).
 * Urutan pelonggaran filter: mapel+materi+tingkat → mapel+tingkat → mapel saja.
 */
export async function getFilteredQuestions(options?: QuestionFilterOptions): Promise<Question[]> {
  const { difficulty, subject, topic, semester } = options || {};

  try {
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const all = (data || []) as Question[];
    const bySubject =
      subject && subject !== "ALL" ? all.filter((q) => subjectMatches(q.subject, subject)) : all;
    const bySemester =
      semester && semester !== "ALL"
        ? bySubject.filter((q) => (q.semester ?? 1) === semester)
        : bySubject;
    const semPool = bySemester.length > 0 ? bySemester : bySubject;
    const byLevel = (list: Question[]) =>
      difficulty && difficulty !== "ALL" ? list.filter((q) => q.difficulty_level === difficulty) : list;

    let result = byLevel(semPool.filter((q) => topicMatches(q.topic, topic)));
    if (result.length === 0) result = byLevel(semPool);
    if (result.length === 0) result = semPool;

    return shuffleArray(result);
  } catch (err) {
    console.error("Gagal query questions terfilter dari Supabase:", err);
    return [];
  }
}

export async function getQuestions(difficulty?: CognitiveLevel): Promise<Question[]> {
  return getFilteredQuestions({ difficulty });
}

/**
 * Ambil semua soal untuk dashboard guru langsung dari Supabase
 */
export async function getAllQuestionsForTeacher(): Promise<Question[]> {
  try {
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as Question[];
  } catch (err) {
    console.error("Gagal query questions guru dari Supabase:", err);
    return [];
  }
}

const QUESTION_BASE_COLUMNS = [
  "subject",
  "difficulty_level",
  "question_text",
  "question_image_url",
  "answer_text",
  "answer_image_url",
  "explanation",
  "is_active",
];
const QUESTION_EXTRA_COLUMNS = ["topic", "semester", "wrong_answers", "keywords"];

function buildQuestionPayload(item: Partial<QuestionInsert>, includeExtras: boolean): Record<string, any> {
  const cols = includeExtras ? [...QUESTION_BASE_COLUMNS, ...QUESTION_EXTRA_COLUMNS] : QUESTION_BASE_COLUMNS;
  const payload: Record<string, any> = {};
  for (const c of cols) {
    const v = (item as any)[c];
    if (v !== undefined) payload[c] = v;
  }
  return payload;
}

/**
 * Tambah banyak soal sekaligus (dipakai oleh Upload Excel maupun form tambah soal).
 * Jika kolom tambahan (topic / wrong_answers / keywords) belum ada di database,
 * soal tetap disimpan dengan kolom dasar.
 */
export async function createQuestionsBulk(items: QuestionInsert[]): Promise<Question[]> {
  if (items.length === 0) return [];
  const prepared = items.map((it) => ({
    ...it,
    question_image_url: it.question_image_url || null,
    answer_image_url: it.answer_image_url || null,
    explanation: it.explanation?.trim() || "-",
    is_active: it.is_active ?? true,
  }));

  let { data, error } = await (supabase.from("questions") as any)
    .insert(prepared.map((p) => buildQuestionPayload(p, true)))
    .select();

  if (error && isSchemaMissingError(error)) {
    console.warn("Kolom tambahan soal belum ada, simpan dengan kolom dasar:", error.message);
    ({ data, error } = await (supabase.from("questions") as any)
      .insert(prepared.map((p) => buildQuestionPayload(p, false)))
      .select());
  }

  if (error) throw friendlyDbError(error, "Gagal menyimpan soal ke database Supabase.");
  return (data || []) as Question[];
}

export async function createQuestion(item: QuestionInsert): Promise<Question> {
  const [created] = await createQuestionsBulk([item]);
  if (!created) throw new Error("Soal tidak tersimpan di database Supabase.");
  return created;
}

export async function updateQuestion(id: string, updates: QuestionUpdate): Promise<Question | null> {
  let { data, error } = await (supabase.from("questions") as any)
    .update(buildQuestionPayload(updates, true))
    .eq("id", id)
    .select()
    .single();

  if (error && isSchemaMissingError(error)) {
    ({ data, error } = await (supabase.from("questions") as any)
      .update(buildQuestionPayload(updates, false))
      .eq("id", id)
      .select()
      .single());
  }

  if (error) throw friendlyDbError(error, "Gagal memperbarui soal di database Supabase.");
  return data as Question;
}

export async function deleteQuestion(id: string): Promise<boolean> {
  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) throw friendlyDbError(error, "Gagal menghapus soal.");
  return true;
}

// ==============================================================================
// 5. GAME SESSIONS & ASSESSMENT REPORTS (Langsung ke Supabase - Tanpa Cache)
// ==============================================================================

/**
 * Buat sesi game baru untuk murid langsung di database Supabase
 */
export async function createGameSession(sessionData: GameSessionInsert): Promise<GameSession> {
  const basePayload: any = {
    room_code: sessionData.room_code || "MIN1-ENDE",
    student_name: sessionData.student_name,
    student_class: sessionData.student_class,
    player_mode: sessionData.player_mode || "individual",
    group_members: sessionData.group_members || null,
    subject: sessionData.subject || "Semua Mapel",
    topic: sessionData.topic || "Semua Materi",
    student_id: sessionData.student_id || null,
    difficulty_level: sessionData.difficulty_level,
    total_questions: sessionData.total_questions,
    time_limit_seconds: sessionData.time_limit_seconds || 300,
    status: sessionData.status || "in_progress",
  };

  try {
    const { data, error } = await (supabase.from("game_sessions") as any)
      .insert([basePayload])
      .select()
      .single();

    if (error) {
      const minimalPayload: any = {
        room_code: sessionData.room_code || "MIN1-ENDE",
        student_name: sessionData.student_name,
        student_class: sessionData.student_class,
        difficulty_level: sessionData.difficulty_level,
        total_questions: sessionData.total_questions,
        time_limit_seconds: sessionData.time_limit_seconds || 300,
        status: sessionData.status || "in_progress",
      };
      const { data: retryData, error: retryErr } = await (supabase.from("game_sessions") as any)
        .insert([minimalPayload])
        .select()
        .single();
      if (retryErr) throw retryErr;
      return retryData as GameSession;
    }

    return data as GameSession;
  } catch (err: any) {
    console.error("Gagal create game_sessions di Supabase:", err);
    throw new Error(err.message || "Gagal membuat sesi di Supabase");
  }
}

/**
 * Perbarui sesi game langsung di database Supabase
 */
export async function updateGameSession(
  sessionId: string,
  updates: Partial<GameSession>
): Promise<GameSession | null> {
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
      .select()
      .single();

    if (error) throw error;
    return (data as GameSession) || null;
  } catch (err) {
    console.error("Gagal update game_sessions di Supabase:", err);
    return null;
  }
}

/**
 * Hapus sesi game langsung dari database Supabase
 */
export async function deleteGameSession(sessionId: string): Promise<boolean> {
  try {
    await (supabase.from("session_answers") as any).delete().eq("session_id", sessionId);
    const { data, error } = await supabase
      .from("game_sessions")
      .delete()
      .eq("id", sessionId)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error(
        "Database Supabase menolak penghapusan (kebijakan DELETE RLS belum aktif). Jalankan file migrasi supabase/migrations/20261127_revisi_soal_kelas.sql di Supabase SQL Editor."
      );
    }
    return true;
  } catch (err: any) {
    console.error("Error saat menghapus game_sessions di Supabase:", err);
    throw err;
  }
}

/**
 * Hapus seluruh riwayat assessment (session_answers & game_sessions) di database Supabase
 */
export async function deleteAllGameSessions(): Promise<boolean> {
  try {
    const { error: ansErr } = await (supabase.from("session_answers") as any)
      .delete()
      .not("id", "is", null);
    if (ansErr) throw ansErr;

    const { error: sessErr } = await (supabase.from("game_sessions") as any)
      .delete()
      .not("id", "is", null);
    if (sessErr) throw sessErr;

    // Pastikan data benar-benar terhapus di Supabase (tidak terblokir RLS)
    const { count } = await supabase
      .from("game_sessions")
      .select("id", { count: "exact", head: true });
    if (count && count > 0) {
      throw new Error(
        "Data di Supabase tidak terhapus karena kebijakan DELETE RLS belum diaktifkan. Jalankan file migrasi supabase/migrations/20261127_revisi_soal_kelas.sql di Supabase SQL Editor."
      );
    }

    return true;
  } catch (err: any) {
    console.error("Error saat menghapus semua game_sessions di Supabase:", err);
    throw err;
  }
}

/**
 * Simpan detail jawaban & argumentasi per kartu langsung ke Supabase
 */
export async function saveSessionAnswer(answerData: SessionAnswerInsert): Promise<SessionAnswer> {
  const payload: any = {
    session_id: answerData.session_id,
    question_id: answerData.question_id,
    user_answer_text: answerData.user_answer_text,
    is_correct: answerData.is_correct,
    argument_type: answerData.argument_type,
    argument_text: answerData.argument_text || null,
    argument_audio_url: answerData.argument_audio_url || null,
    argument_score: answerData.argument_score ?? 70,
  };

  try {
    const { data, error } = await (supabase.from("session_answers") as any)
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data as SessionAnswer;
  } catch (err) {
    console.error("Gagal simpan session_answers di Supabase:", err);
    return {
      id: `ans_${Date.now()}`,
      ...answerData,
      argument_score: answerData.argument_score ?? 70,
      submitted_at: new Date().toISOString(),
    } as SessionAnswer;
  }
}

/**
 * Ambil daftar semua sesi game (Assessment Report) langsung dari database Supabase
 */
export async function getGameSessionsReport(): Promise<GameSession[]> {
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

    const list = (data || []) as GameSession[];
    return list.filter(
      (s) => s.status !== "in_progress" || (s.answers && s.answers.length > 0) || Number(s.final_score) > 0
    );
  } catch (err) {
    console.error("Gagal query assessment report di Supabase:", err);
    return [];
  }
}

/**
 * Perbarui nilai kualitas argumentasi oleh Guru langsung di database Supabase
 */
export async function updateArgumentScore(
  answerId: string,
  newScore: number,
  comment?: string
): Promise<boolean> {
  try {
    const payload: any = { argument_score: newScore };
    if (comment !== undefined) payload.teacher_comment = comment;

    const { error } = await (supabase.from("session_answers") as any)
      .update(payload)
      .eq("id", answerId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Gagal update skor argumentasi di Supabase:", err);
    return false;
  }
}
