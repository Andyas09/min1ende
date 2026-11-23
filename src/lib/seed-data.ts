import { Question, CognitiveLevel, BloomLevelInfo, SubjectItem } from "@/types";

export const DEFAULT_SUBJECTS: SubjectItem[] = [
  {
    id: "sub-ipas",
    name: "IPAS / Sains",
    icon: "🔬",
    description: "Ilmu Pengetahuan Alam & Sosial: Ekosistem, Wujud Benda, dan Organ",
    topics: [
      "Semua Materi IPAS",
      "Ekosistem & Hewan",
      "Fotosintesis & Tumbuhan",
      "Perubahan Wujud Benda",
      "Hukum Fisika & Ekologi",
    ],
  },
  {
    id: "sub-mtk",
    name: "Matematika",
    icon: "📐",
    description: "Operasi hitung aritmatika, geometri bangun datar, dan nalar rasio",
    topics: [
      "Semua Materi Matematika",
      "Perkalian & Aritmatika",
      "Geometri & Bangun Datar",
      "Perbandingan & Nalar",
    ],
  },
  {
    id: "sub-pai",
    name: "Pendidikan Agama Islam",
    icon: "🕌",
    description: "Rukun Islam, akhlak karimah, dan literasi tabayyun",
    topics: [
      "Semua Materi PAI",
      "Rukun Islam & Syariat",
      "Akhlak Mulia & Tabayyun",
    ],
  },
  {
    id: "sub-ende",
    name: "Kearifan Lokal Ende & NTT",
    icon: "🌺",
    description: "Danau Kelimutu, jejak Bung Karno di Ende, dan sejarah Pancasila",
    topics: [
      "Semua Materi Ende & NTT",
      "Danau Kelimutu Flores",
      "Pohon Sukun & Bung Karno",
    ],
  },
];

export const BLOOM_LEVELS: Record<CognitiveLevel, BloomLevelInfo> = {
  Easy: {
    level: "Easy",
    title: "Tingkat Mudah",
    bloomTaxonomy: "C1–C2 • Mengingat & Memahami",
    description: "Mengenal fakta, istilah dasar, dan konsep sederhana materi pelajaran.",
    color: "from-emerald-500 to-teal-600",
    badgeBg: "bg-emerald-100 dark:bg-emerald-950/80",
    badgeText: "text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700",
    cardBorder: "border-emerald-400 hover:border-emerald-500",
    iconName: "Sparkles",
    recommendedTime: 300, // 5 menit
  },
  Medium: {
    level: "Medium",
    title: "Tingkat Menengah",
    bloomTaxonomy: "C3–C4 • Menerapkan & Menganalisis",
    description: "Menerapkan rumus/konsep dan menghubungkan sebab-akibat fenomena.",
    color: "from-amber-500 to-orange-600",
    badgeBg: "bg-amber-100 dark:bg-amber-950/80",
    badgeText: "text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700",
    cardBorder: "border-amber-400 hover:border-amber-500",
    iconName: "Flame",
    recommendedTime: 360, // 6 menit
  },
  HOTS: {
    level: "HOTS",
    title: "Tingkat HOTS",
    bloomTaxonomy: "C4–C6 • Nalar Kritis & Evaluasi",
    description: "Pemecahan masalah kompleks, nalar kritis, dan evaluasi ilmiah kontekstual.",
    color: "from-rose-500 to-purple-600",
    badgeBg: "bg-rose-100 dark:bg-rose-950/80",
    badgeText: "text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700",
    cardBorder: "border-rose-400 hover:border-rose-500",
    iconName: "Zap",
    recommendedTime: 420, // 7 menit
  },
};

export const INITIAL_QUESTIONS: Question[] = [
  // ================= EASY (C1 - C2) =================
  {
    id: "q-easy-1",
    subject: "IPAS / Sains",
    topic: "Ekosistem & Hewan",
    difficulty_level: "Easy",
    question_text: "Hewan pemakan tumbuhan (seperti sapi dan kambing)",
    answer_text: "Herbivora",
    explanation:
      "Herbivora adalah golongan hewan yang mengonsumsi tumbuhan sebagai makanan utamanya, memiliki gigi seri dan geraham yang kuat untuk mengunyah rumput.",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "q-easy-2",
    subject: "Matematika",
    topic: "Perkalian & Aritmatika",
    difficulty_level: "Easy",
    question_text: "Hasil perhitungan dari 12 x 8",
    answer_text: "96",
    explanation:
      "12 dikalikan 8 sama dengan 96. Dapat dihitung dengan cara distributif: (10 x 8) + (2 x 8) = 80 + 16 = 96.",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "q-easy-3",
    subject: "Kearifan Lokal Ende & NTT",
    topic: "Danau Kelimutu Flores",
    difficulty_level: "Easy",
    question_text: "Danau kawah tiga warna yang terkenal di Kabupaten Ende, Flores",
    answer_text: "Danau Kelimutu",
    explanation:
      "Danau Kelimutu terletak di Gunung Kelimutu, Kabupaten Ende, Pulau Flores, NTT. Memiliki 3 danau kawah dengan warna unik yang dapat berganti akibat aktivitas mineral dan gas vulkanik.",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "q-easy-4",
    subject: "Pendidikan Agama Islam",
    topic: "Rukun Islam & Syariat",
    difficulty_level: "Easy",
    question_text: "Rukun Islam kedua setelah mengucapkan dua kalimat syahadat",
    answer_text: "Mendirikan Shalat",
    explanation:
      "Rukun Islam yang fundamental terdiri dari: Mengucapkan Dua Kalimah Syahadat, Mendirikan Shalat 5 Waktu, Membayar Zakat, Berpuasa di Bulan Ramadhan, dan Menunaikan Haji bagi yang mampu.",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // ================= MEDIUM (C3 - C4) =================
  {
    id: "q-med-1",
    subject: "IPAS / Sains",
    topic: "Fotosintesis & Tumbuhan",
    difficulty_level: "Medium",
    question_text:
      "Organ tumbuhan yang berperan paling utama dalam proses fotosintesis dengan bantuan klorofil",
    answer_text: "Daun",
    explanation:
      "Daun memiliki jaringan tiang (palisade) yang kaya klorofil untuk menyerap sinar matahari dan mengolah CO2 serta air menjadi glukosa dan oksigen.",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "q-med-2",
    subject: "Matematika",
    topic: "Geometri & Bangun Datar",
    difficulty_level: "Medium",
    question_text:
      "Sebuah bangun persegi memiliki keliling 48 cm. Berapakah luas daerah persegi tersebut?",
    answer_text: "144 cm²",
    explanation:
      "Panjang sisi persegi = Keliling / 4 = 48 / 4 = 12 cm. Luas persegi = sisi x sisi = 12 x 12 = 144 cm².",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "q-med-3",
    subject: "Kearifan Lokal Ende & NTT",
    topic: "Pohon Sukun & Bung Karno",
    difficulty_level: "Medium",
    question_text:
      "Kota bersejarah di Flores tempat Bung Karno diasingkan (1934-1938) dan merenungkan dasar Pancasila",
    answer_text: "Kota Ende",
    explanation:
      "Bung Karno diasingkan oleh Belanda ke Ende dari tahun 1934 hingga 1938. Di bawah rindangnya pohon sukun bercabang lima dekat pantai Ende, gagasan luhur Pancasila direnungkan.",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "q-med-4",
    subject: "IPAS / Sains",
    topic: "Perubahan Wujud Benda",
    difficulty_level: "Medium",
    question_text:
      "Peristiwa perubahan wujud benda dari padat langsung berubah menjadi gas tanpa fase cair",
    answer_text: "Menyublim",
    explanation:
      "Menyublim adalah perubahan wujud dari padat langsung menjadi gas. Contoh nyatanya adalah kapur barus (kamper) atau es kering yang menguap di suhu ruang.",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },

  // ================= HOTS (C4 - C6) =================
  {
    id: "q-hots-1",
    subject: "IPAS / Sains",
    topic: "Hukum Fisika & Ekologi",
    difficulty_level: "HOTS",
    question_text:
      "Jika populasi katak di ekosistem sawah menurun drastis akibat diburu manusia, apa dampak berantai yang terjadi?",
    answer_text: "Populasi belalang melonjak liar dan panen padi menurun drastis",
    explanation:
      "Dalam rantai makanan: Padi -> Belalang -> Katak -> Ular. Hilangnya predator alami (katak) menyebabkan ledakan hama belalang yang merusak tanaman padi petani.",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "q-hots-2",
    subject: "Matematika",
    topic: "Perbandingan & Nalar",
    difficulty_level: "HOTS",
    question_text:
      "Perbandingan tabungan Ahmad dan Budi adalah 3 : 5. Selisih uang mereka Rp 40.000. Berapa total uang keduanya?",
    answer_text: "Rp 160.000",
    explanation:
      "Selisih rasio = 5 - 3 = 2 satuan. Nilai 1 satuan = Rp 40.000 / 2 = Rp 20.000. Jumlah total rasio = 3 + 5 = 8 satuan. Total uang = 8 x Rp 20.000 = Rp 160.000.",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "q-hots-3",
    subject: "IPAS / Sains",
    topic: "Hukum Fisika & Ekologi",
    difficulty_level: "HOTS",
    question_text:
      "Mengapa kapal laut raksasa berbahan besi baja ribuan ton dapat mengapung, sedangkan jarum kecil tenggelam?",
    answer_text: "Hukum Archimedes: Lambung kapal berongga membuat massa jenis rata-ratanya lebih kecil dari air",
    explanation:
      "Kapal dirancang dengan rongga udara raksasa di lambungnya, sehingga volume air yang dipindahkan sangat besar dan menghasilkan gaya angkat ke atas yang melampaui berat total kapal.",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "q-hots-4",
    subject: "Pendidikan Agama Islam",
    topic: "Akhlak Mulia & Tabayyun",
    difficulty_level: "HOTS",
    question_text:
      "Langkah nalar kritis seorang murid MIN 1 Ende yang berakhlak mulia saat menerima berita viral kontroversial di grup WhatsApp",
    answer_text: "Tabayyun: Mengkroscek fakta dari sumber terpercaya sebelum mempercayai atau membagikan",
    explanation:
      "Sesuai perintah Al-Qur'an (QS. Al-Hujurat: 6 tentang Tabayyun), seorang muslim wajib memverifikasi kebenaran informasi terlebih dahulu agar tidak menyebarkan fitnah atau kepalsuan.",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
