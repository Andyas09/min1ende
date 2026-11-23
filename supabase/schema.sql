-- ==============================================================================
-- SD MATCH (Smart Digital Make A Match) - MIN 1 ENDE
-- SKEMA BASIS DATA SUPABASE (PostgreSQL) + RLS + STORAGE POLICIES
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('guru', 'murid', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE cognitive_level AS ENUM ('Easy', 'Medium', 'HOTS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE argument_type AS ENUM ('voice', 'text');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE session_status AS ENUM ('in_progress', 'completed', 'reviewed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 3. TABEL: PROFILES (Guru & Fasilitator)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    role user_role NOT NULL DEFAULT 'guru',
    school TEXT NOT NULL DEFAULT 'MIN 1 Ende',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 4. TABEL: QUESTIONS (Bank Soal Pasangan Kartu Make A Match)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    subject TEXT NOT NULL DEFAULT 'Tematik / IPAS',
    difficulty_level cognitive_level NOT NULL DEFAULT 'Easy',
    question_text TEXT NOT NULL,
    question_image_url TEXT,
    answer_text TEXT NOT NULL,
    answer_image_url TEXT,
    explanation TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_questions_active ON public.questions(is_active);

-- ==============================================================================
-- 5. TABEL: GAME_SESSIONS (Sesi Permainan Murid)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code TEXT NOT NULL DEFAULT 'MIN1-ENDE',
    student_name TEXT NOT NULL,
    student_class TEXT NOT NULL,
    player_mode TEXT NOT NULL DEFAULT 'individual',
    group_members TEXT,
    subject TEXT DEFAULT 'Semua Mapel',
    topic TEXT DEFAULT 'Semua Materi',
    student_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    difficulty_level cognitive_level NOT NULL DEFAULT 'Easy',
    total_questions INT NOT NULL DEFAULT 0,
    correct_answers INT NOT NULL DEFAULT 0,
    time_limit_seconds INT NOT NULL DEFAULT 300,
    time_spent_seconds INT NOT NULL DEFAULT 0,
    
    -- Komponen Penilaian 4 Pilar SD Match:
    -- 1. Ketepatan Pasangan: 40%
    -- 2. Kualitas Argumentasi: 30%
    -- 3. Aktivitas (Partisipasi & Kelengkapan Argumen): 20%
    -- 4. Ketepatan Waktu: 10%
    score_pairing NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    score_argumentation NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    score_activity NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    score_time NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    final_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    
    status session_status NOT NULL DEFAULT 'in_progress',
    teacher_feedback TEXT,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_room ON public.game_sessions(room_code);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON public.game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created ON public.game_sessions(created_at DESC);

-- ==============================================================================
-- 6. TABEL: SESSION_ANSWERS (Detail Jawaban & Argumentasi per Kartu)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.session_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    user_answer_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    argument_type argument_type NOT NULL,
    argument_text TEXT,
    argument_audio_url TEXT,
    argument_score NUMERIC(5,2) NOT NULL DEFAULT 70.00,
    teacher_comment TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_session_answers_session ON public.session_answers(session_id);

-- ==============================================================================
-- 7. FUNCTION & TRIGGER: Auto Update updated_at
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_questions_updated_at ON public.questions;
CREATE TRIGGER set_questions_updated_at
BEFORE UPDATE ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 8. FUNCTION: Auto Kalkulasi Skor Akhir Game Session
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.calculate_final_score(
    p_pairing NUMERIC,
    p_argumentation NUMERIC,
    p_activity NUMERIC,
    p_time NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
    -- Bobot: Pasangan 40%, Argumentasi 30%, Aktivitas 20%, Waktu 10%
    RETURN ROUND(
        (COALESCE(p_pairing, 0) * 0.40) +
        (COALESCE(p_argumentation, 0) * 0.30) +
        (COALESCE(p_activity, 0) * 0.20) +
        (COALESCE(p_time, 0) * 0.10),
        2
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger auto calculate final_score pada game_sessions
CREATE OR REPLACE FUNCTION public.trigger_recalculate_session_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.final_score = public.calculate_final_score(
        NEW.score_pairing,
        NEW.score_argumentation,
        NEW.score_activity,
        NEW.score_time
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_calc_session_score ON public.game_sessions;
CREATE TRIGGER auto_calc_session_score
BEFORE INSERT OR UPDATE OF score_pairing, score_argumentation, score_activity, score_time
ON public.game_sessions
FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_session_score();

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_answers ENABLE ROW LEVEL SECURITY;

-- Profiles:
-- 1. Pengguna dapat membaca profil sendiri atau profil publik guru
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Questions:
-- 1. Semua pengguna (termasuk murid anonim/pemain) dapat melihat soal yang aktif
CREATE POLICY "Active questions are viewable by anyone" 
ON public.questions FOR SELECT USING (is_active = true OR auth.role() = 'authenticated');

-- 2. Guru/Admin terautentikasi dapat menambah, mengubah, dan menghapus soal
CREATE POLICY "Authenticated users can insert questions" 
ON public.questions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update questions" 
ON public.questions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete questions" 
ON public.questions FOR DELETE TO authenticated USING (true);

-- Game Sessions:
-- 1. Murid atau siapapun dapat membuat game session baru (anonymous player)
CREATE POLICY "Anyone can create game sessions" 
ON public.game_sessions FOR INSERT WITH CHECK (true);

-- 2. Semua orang dapat membaca game sessions (untuk leaderboard & riwayat murid)
CREATE POLICY "Anyone can view game sessions" 
ON public.game_sessions FOR SELECT USING (true);

-- 3. Pemain dapat mengupdate sesi miliknya atau guru terautentikasi dapat mengupdate nilai
CREATE POLICY "Anyone can update game sessions" 
ON public.game_sessions FOR UPDATE USING (true);

-- Session Answers:
-- 1. Murid dapat memasukkan jawaban ke sesi mereka
CREATE POLICY "Anyone can insert session answers" 
ON public.session_answers FOR INSERT WITH CHECK (true);

-- 2. Siapapun dapat membaca jawaban sesi
CREATE POLICY "Anyone can view session answers" 
ON public.session_answers FOR SELECT USING (true);

-- 3. Guru terautentikasi dapat mengupdate penilaian/komentar argumentasi
CREATE POLICY "Anyone can update session answers" 
ON public.session_answers FOR UPDATE USING (true);

-- ==============================================================================
-- 10. STORAGE BUCKETS CONFIGURATION
-- ==============================================================================
-- Bucket 1: soal-images (Penyimpanan gambar soal & kartu jawaban)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'soal-images',
    'soal-images',
    true,
    5242880, -- 5MB limit
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

-- Bucket 2: argumentasi-audio (Penyimpanan rekaman suara Voice Note murid)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'argumentasi-audio',
    'argumentasi-audio',
    true,
    15728640, -- 15MB limit
    ARRAY['audio/webm', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/mpeg', 'audio/m4a']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 15728640,
    allowed_mime_types = ARRAY['audio/webm', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/mpeg', 'audio/m4a'];

-- Storage Security Policies:
-- 1. Public Read Access untuk gambar soal
DROP POLICY IF EXISTS "Public Access Soal Images" ON storage.objects;
CREATE POLICY "Public Access Soal Images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'soal-images');

DROP POLICY IF EXISTS "Public Insert Soal Images" ON storage.objects;
CREATE POLICY "Public Insert Soal Images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'soal-images');

-- 2. Public Read & Upload Access untuk Audio Voice Note Argumentasi Murid
DROP POLICY IF EXISTS "Public Access Argumentasi Audio" ON storage.objects;
CREATE POLICY "Public Access Argumentasi Audio" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'argumentasi-audio');

DROP POLICY IF EXISTS "Public Insert Argumentasi Audio" ON storage.objects;
CREATE POLICY "Public Insert Argumentasi Audio" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'argumentasi-audio');

-- ==============================================================================
-- 11. DATA AWAL (SEED DATA) BERKUALITAS UNTUK MIN 1 ENDE
-- ==============================================================================
INSERT INTO public.questions (subject, difficulty_level, question_text, answer_text, explanation)
VALUES
-- === LEVEL: EASY (Taksonomi Bloom C1 - C2: Mengingat & Memahami) ===
(
    'IPAS / Sains',
    'Easy',
    'Hewan pemakan tumbuhan (seperti sapi dan kambing)',
    'Herbivora',
    'Herbivora adalah golongan hewan yang mengonsumsi tumbuhan sebagai makanan utamanya, memiliki gigi seri dan geraham yang kuat untuk mengunyah rumput.'
),
(
    'Matematika',
    'Easy',
    'Hasil perhitungan dari 12 x 8',
    '96',
    '12 dikalikan 8 sama dengan 96. Dapat dihitung dengan (10 x 8) + (2 x 8) = 80 + 16 = 96.'
),
(
    'Budaya & Daerah NTT',
    'Easy',
    'Danau tiga warna yang terkenal di Kabupaten Ende, Flores',
    'Danau Kelimutu',
    'Danau Kelimutu terletak di Gunung Kelimutu, Ende, Flores, NTT. Memiliki tiga kawah dengan warna berbeda yang dapat berubah secara berkala akibat aktivitas mineral vulkanik.'
),
(
    'Pendidikan Agama Islam',
    'Easy',
    'Rukun Islam yang kedua setelah mengucapkan dua kalimat syahadat',
    'Mendirikan Shalat',
    'Rukun Islam terdiri dari: Syahadat, Shalat 5 waktu, Puasa Ramadhan, Menunaikan Zakat, dan Haji bagi yang mampu.'
),

-- === LEVEL: MEDIUM (Taksonomi Bloom C3 - C4: Menerapkan & Menganalisis) ===
(
    'IPAS / Ekosistem',
    'Medium',
    'Organ tumbuhan yang berperan paling utama dalam proses fotosintesis dengan bantuan klorofil',
    'Daun',
    'Daun memiliki jaringan palisade yang kaya akan klorofil (zat hijau daun) untuk menangkap energi matahari dan mengubah karbon dioksida serta air menjadi glukosa dan oksigen.'
),
(
    'Matematika',
    'Medium',
    'Sebuah persegi memiliki keliling 48 cm. Berapakah luas daerah persegi tersebut?',
    '144 cm²',
    'Keliling = 4 x sisi, sehingga panjang sisi = 48 / 4 = 12 cm. Luas persegi = sisi x sisi = 12 x 12 = 144 cm².'
),
(
    'Sejarah & Kebangsaan',
    'Medium',
    'Kota bersejarah di Pulau Flores tempat Ir. Soekarno diasingkan (1934-1938) dan merenungkan dasar negara Pancasila',
    'Kota Ende',
    'Bung Karno diasingkan oleh pemerintah kolonial Belanda ke Ende dari tahun 1934 hingga 1938. Di bawah pohon sukun bercabang lima dekat pantai Ende, beliau merenungkan butir-butir mutiara Pancasila.'
),
(
    'IPAS / Fisika Sederhana',
    'Medium',
    'Peristiwa perubahan wujud benda dari padat langsung menjadi gas tanpa melalui fase cair',
    'Menyublim',
    'Menyublim adalah perubahan wujud padat ke gas, contohnya kapur barus (kamper) atau es kering (dry ice) yang diletakkan di ruang terbuka.'
),

-- === LEVEL: HOTS (Taksonomi Bloom C4 - C6: Menganalisis, Mengevaluasi & Mencipta) ===
(
    'IPAS / Lingkungan Hidup',
    'HOTS',
    'Jika populasi katak di suatu sawah menurun drastis akibat perburuan liar, dampak ekologis berantai yang paling mungkin terjadi pada populasi belalang dan hasil panen padi',
    'Populasi belalang melonjak drastis dan panen padi menurun',
    'Dalam rantai makanan sawah (Padi -> Belalang -> Katak -> Ular), katak adalah predator alami belalang. Hilangnya predator membuat hama belalang berkembang biak tanpa kendali, merusak tanaman padi dan menurunkan panen.'
),
(
    'Matematika / Pemecahan Masalah',
    'HOTS',
    'Perbandingan uang Ahmad dan Budi adalah 3 : 5. Jika selisih uang mereka adalah Rp 40.000, berapakah jumlah total uang Ahmad dan Budi?',
    'Rp 160.000',
    'Selisih perbandingan = 5 - 3 = 2 bagian. 1 bagian = Rp 40.000 / 2 = Rp 20.000. Jumlah rasio = 3 + 5 = 8 bagian. Total uang = 8 x Rp 20.000 = Rp 160.000.'
),
(
    'IPAS / Gaya & Energi',
    'HOTS',
    'Mengapa kapal laut berbahan besi baja yang sangat berat dapat terapung di lautan, sedangkan sebutir jarum kecil tenggelam?',
    'Prinsip Hukum Archimedes: Bentuk lambung berongga membuat massa jenis total kapal lebih kecil dari air',
    'Berdasarkan hukum Archimedes, kapal laut memiliki volume rongga udara yang sangat besar di lambungnya, sehingga gaya angkat ke atas (buoyant force) melebihi berat total kapal, menghasilkan massa jenis rata-rata kapal lebih kecil daripada massa jenis air laut.'
),
(
    'Karakter & Etika Digital',
    'HOTS',
    'Sikap kritis yang paling tepat dilakukan seorang murid cerdas ketika menerima berita viral yang heboh dan mencurigakan di media sosial',
    'Tabayyun: Menguji kebenaran sumber rujukan resmi sebelum mempercayai atau membagikannya',
    'Sesuai nilai Islam (QS. Al-Hujurat: 6 tentang Tabayyun) dan literasi digital abad 21, setiap informasi harus diverifikasi kredibilitas sumbernya terlebih dahulu agar terhindar dari fitnah dan hoaks.'
)
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 12. MIGRATION PATCH (Jalankan ini jika tabel sudah dibuat sebelumnya)
-- ==============================================================================
ALTER TABLE IF EXISTS public.game_sessions ADD COLUMN IF NOT EXISTS player_mode TEXT DEFAULT 'individual';
ALTER TABLE IF EXISTS public.game_sessions ADD COLUMN IF NOT EXISTS group_members TEXT;
ALTER TABLE IF EXISTS public.game_sessions ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT 'Semua Mapel';
ALTER TABLE IF EXISTS public.game_sessions ADD COLUMN IF NOT EXISTS topic TEXT DEFAULT 'Semua Materi';
ALTER TABLE IF EXISTS public.questions ADD COLUMN IF NOT EXISTS topic TEXT;


