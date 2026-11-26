-- ==============================================================================
-- MIGRASI DATABASE SD MATCH - MIN 1 ENDE
-- Jalankan script ini di Supabase Dashboard -> SQL Editor -> New Query
-- ==============================================================================

-- 1. Tambah kolom baru pada tabel questions (materi/topik, pengecoh, dan kata kunci argumentasi)
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS topic TEXT DEFAULT 'Materi Umum';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS wrong_answers TEXT[] DEFAULT '{}';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}';

-- 2. Pastikan guru yang login melalui tabel profiles dapat menyimpan/mengubah/menghapus soal
DROP POLICY IF EXISTS "Authenticated users can insert questions" ON public.questions;
DROP POLICY IF EXISTS "Authenticated users can update questions" ON public.questions;
DROP POLICY IF EXISTS "Authenticated users can delete questions" ON public.questions;

CREATE POLICY "Allow all insert questions" ON public.questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update questions" ON public.questions FOR UPDATE USING (true);
CREATE POLICY "Allow all delete questions" ON public.questions FOR DELETE USING (true);

-- 3. Tambah kolom mode pemain pada tabel game_sessions (Individu / Pasangan / Kelompok)
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS player_mode TEXT NOT NULL DEFAULT 'individual';
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS group_members TEXT;
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT 'Semua Mapel';
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS topic TEXT DEFAULT 'Semua Materi';

-- 4. Buat tabel classes (Pengaturan Daftar Kelas oleh Guru)
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to classes" ON public.classes;
CREATE POLICY "Allow all access to classes" ON public.classes FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.classes (name, description) VALUES
  ('4A', 'Kelas 4A'),
  ('4B', 'Kelas 4B'),
  ('5A', 'Kelas 5A'),
  ('5B', 'Kelas 5B'),
  ('6A', 'Kelas 6A'),
  ('6B', 'Kelas 6B')
ON CONFLICT (name) DO NOTHING;

-- 5. Buat tabel subjects (Mata Pelajaran & Materi)
CREATE TABLE IF NOT EXISTS public.subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '📚',
    description TEXT DEFAULT '',
    topics TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to subjects" ON public.subjects;
CREATE POLICY "Allow all access to subjects" ON public.subjects FOR ALL USING (true) WITH CHECK (true);

-- 6. Izinkan penghapusan data assessment (game_sessions & session_answers) oleh guru
DROP POLICY IF EXISTS "Anyone can delete game sessions" ON public.game_sessions;
CREATE POLICY "Anyone can delete game sessions" ON public.game_sessions FOR DELETE USING (true);

DROP POLICY IF EXISTS "Anyone can delete session answers" ON public.session_answers;
CREATE POLICY "Anyone can delete session answers" ON public.session_answers FOR DELETE USING (true);

-- 7. Dukungan Semester 1 dan Semester 2 pada materi (subjects) dan soal (questions)
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS topics_semester_2 TEXT[] DEFAULT '{}';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS semester INT NOT NULL DEFAULT 1;
