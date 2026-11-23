import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, Image as RLImage
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas

# Palette MIN 1 Ende
PRIMARY_EMERALD = colors.HexColor("#059669")
DARK_EMERALD = colors.HexColor("#065F46")
LIGHT_EMERALD = colors.HexColor("#ECFDF5")
ACCENT_BLUE = colors.HexColor("#2563EB")
LIGHT_BLUE = colors.HexColor("#EFF6FF")
TEXT_DARK = colors.HexColor("#0F172A")
TEXT_MUTED = colors.HexColor("#475569")
CARD_BG = colors.HexColor("#F8FAFC")
BORDER_COLOR = colors.HexColor("#CBD5E1")
GOLD_ACCENT = colors.HexColor("#D97706")

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(TEXT_MUTED)
        
        # Header (Pages 2+)
        if self._pageNumber > 1:
            self.setStrokeColor(BORDER_COLOR)
            self.setLineWidth(0.5)
            self.line(40, 805, 555, 805)
            self.drawString(40, 812, "SD Match (Smart Digital Make A Match) — MIN 1 Ende")
            self.drawRightString(555, 812, "Laporan Presentasi & Panduan Klien")

        # Footer (All pages)
        self.setStrokeColor(BORDER_COLOR)
        self.setLineWidth(0.5)
        self.line(40, 42, 555, 42)
        self.drawString(40, 30, "Madrasah Ibtidaiyah Negeri (MIN) 1 Ende • Flores, Nusa Tenggara Timur")
        self.drawRightString(555, 30, f"Halaman {self._pageNumber} dari {page_count}")
        self.restoreState()

def build_pdf(filename="Dokumentasi_SD_Match_MIN1_Ende.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=48,
        bottomMargin=48
    )

    styles = getSampleStyleSheet()
    
    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=DARK_EMERALD,
        spaceAfter=4
    )
    
    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=DARK_EMERALD,
        spaceBefore=8,
        spaceAfter=6
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=TEXT_DARK,
        spaceBefore=4,
        spaceAfter=3
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=TEXT_DARK,
        spaceAfter=4
    )

    body_bold = ParagraphStyle(
        'BodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    badge_style = ParagraphStyle(
        'Badge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=PRIMARY_EMERALD,
        alignment=1
    )

    story = []

    # =========================================================================
    # HALAMAN 1: EKSEKUTIF SUMMARY & IDENTITAS PLATFORM
    # =========================================================================
    # Header Banner Table with Logo Placeholder/Metadata
    header_data = [
        [
            Paragraph("<b>MIN 1 ENDE</b><br/><font size=7 color='#475569'>Madrasah Ibtidaiyah Negeri 1 Ende<br/>Kab. Ende, Flores, NTT</font>", body_style),
            Paragraph("<b>SD MATCH (SMART DIGITAL MAKE A MATCH)</b><br/><font size=7 color='#059669'>Media Pembelajaran Kooperatif Interaktif Berbasis Gamifikasi Kognitif Bloom</font>", ParagraphStyle('HRight', parent=body_style, alignment=2))
        ]
    ]
    t_header = Table(header_data, colWidths=[200, 315])
    t_header.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, -1), 1.5, PRIMARY_EMERALD),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_header)
    story.append(Spacer(1, 10))

    story.append(Paragraph("PROPOSAL & RINGKASAN PRODUK APLIKASI WEB", ParagraphStyle('SubSub', parent=body_style, fontName='Helvetica-Bold', textColor=GOLD_ACCENT, fontSize=9)))
    story.append(Paragraph("SD MATCH: Inovasi Digital Pembelajaran Make A Match", title_style))
    story.append(Paragraph(
        "SD Match adalah aplikasi web edukasi interaktif modern yang dirancang khusus untuk memenuhi kebutuhan implementasi <b>Kurikulum Merdeka</b> di <b>MIN 1 Ende</b>. Aplikasi ini mentransformasikan metode pembelajaran kooperatif konvensional <i>Make A Match</i> menjadi pengalaman digital multimedia yang memadukan aktivitas fisik mencocokkan kartu, penalaran kritis kognitif Bloom, serta pertanggungjawaban argumen lisan (Voice Note) dan tulisan.",
        body_style
    ))
    story.append(Spacer(1, 6))

    # Info Box: Latar Belakang & Filosofi 4 Pilar
    pilar_data = [
        [
            Paragraph("<b>4 PILAR UTAMA PEMBELAJARAN SD MATCH</b>", ParagraphStyle('PilHead', parent=body_style, fontName='Helvetica-Bold', textColor=DARK_EMERALD, fontSize=9)),
            ""
        ],
        [
            Paragraph("<b>1. Belajar (Konseptual)</b><br/>Memahami materi ajar, istilah, fakta, dan konsep dasar madrasah secara terstruktur.", body_style),
            Paragraph("<b>2. Bermain (Gamifikasi)</b><br/>Mencocokkan pasangan kartu soal (biru) dan kartu kunci (hijau) dengan batas waktu & audio imersif.", body_style)
        ],
        [
            Paragraph("<b>3. Berpikir (Nalar Kritis)</b><br/>Mengasah daya nalar murid berjenjang kognitif Taksonomi Bloom (C1-C2 Mudah, C3-C4 Sedang, C4-C6 HOTS).", body_style),
            Paragraph("<b>4. Berargumentasi (Literasi)</b><br/>Murid wajib menjelaskan alasan kecocokan kartu melalui <b>Voice Note (suara)</b> atau teks sebelum diverifikasi.", body_style)
        ]
    ]
    t_pilar = Table(pilar_data, colWidths=[255, 260])
    t_pilar.setStyle(TableStyle([
        ('SPAN', (0, 0), (1, 0)),
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_EMERALD),
        ('BOX', (0, 0), (-1, -1), 1, PRIMARY_EMERALD),
        ('INNERGRID', (0, 1), (-1, -1), 0.5, colors.HexColor("#A7F3D0")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t_pilar)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Tujuan & Manfaat Strategis untuk MIN 1 Ende", h1_style))
    manfaat_data = [
        [Paragraph("<b>Aspek Pembelajaran</b>", body_bold), Paragraph("<b>Kondisi Konvensional</b>", body_bold), Paragraph("<b>Solusi Aplikasi SD Match</b>", body_bold)],
        [
            Paragraph("Interaksi Siswa", body_style),
            Paragraph("Pasif menghafal, kartu kertas cepat rusak dan mudah tercecer.", body_style),
            Paragraph("Interaktif digital, kartu acak dinamis, dilengkapi ilustrasi & multimedia.", body_style)
        ],
        [
            Paragraph("Penilaian Nalar Kritis", body_style),
            Paragraph("Hanya dinilai benar/salah secara instan tanpa verifikasi argumen.", body_style),
            Paragraph("Wajib merekam suara (Voice Note) atau menulis analisis mengapa jawaban dipilih.", body_style)
        ],
        [
            Paragraph("Evaluasi Guru", body_style),
            Paragraph("Koreksi manual butuh waktu lama, audio murid tidak terdokumentasi.", body_style),
            Paragraph("Dashboard otomatis kalkulasi 4 pilar, pemutar audio VN, dan ekspor Excel.", body_style)
        ],
        [
            Paragraph("Akses Perangkat", body_style),
            Paragraph("Terbatas di lab komputer sekolah.", body_style),
            Paragraph("Web responsif: Berjalan lancar di HP Android, Tablet, Chromebook, & Laptop.", body_style)
        ]
    ]
    t_manfaat = Table(manfaat_data, colWidths=[100, 185, 230])
    t_manfaat.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_manfaat)

    story.append(PageBreak())

    # =========================================================================
    # HALAMAN 2: ALUR PERSIAPAN PERMAINAN & ARSITEKTUR GAME
    # =========================================================================
    story.append(Paragraph("ALUR MENU PERSIAPAN PERMAINAN SISWA", title_style))
    story.append(Paragraph(
        "Sebelum murid memasuki arena Make A Match, sistem menyediakan menu persiapan terstruktur 6 tahap yang fleksibel untuk permainan mandiri maupun kelompok kooperatif:",
        body_style
    ))
    story.append(Spacer(1, 6))

    step_prep = [
        [
            Paragraph("<b>Tahap</b>", body_bold),
            Paragraph("<b>Komponen Pengaturan</b>", body_bold),
            Paragraph("<b>Fungsi & Keunggulan bagi Siswa MIN 1 Ende</b>", body_bold)
        ],
        [
            Paragraph("<b>1</b>", badge_style),
            Paragraph("<b>Mode & Identitas Pemain</b>", body_style),
            Paragraph("Pilihan mode <b>Individu</b> (nama murid & kelas) atau mode <b>Kelompok</b> (nama kelompok + daftar anggota tim). Mendorong kolaborasi kooperatif.", body_style)
        ],
        [
            Paragraph("<b>2</b>", badge_style),
            Paragraph("<b>Pilihan Mata Pelajaran</b>", body_style),
            Paragraph("Daftar mapel dinamis hasil input guru (IPAS/Sains, Matematika, Akidah Akhlak, Fikih, SKI, B. Arab, dll) atau opsi <i>Semua Mapel</i>.", body_style)
        ],
        [
            Paragraph("<b>3</b>", badge_style),
            Paragraph("<b>Pilihan Materi Pokok</b>", body_style),
            Paragraph("Sub-topik materi terfilter otomatis sesuai mata pelajaran yang dipilih sehingga latihan soal tepat sasaran dengan silabus kelas.", body_style)
        ],
        [
            Paragraph("<b>4</b>", badge_style),
            Paragraph("<b>Jumlah Pasangan Kartu</b>", body_style),
            Paragraph("Desain kartu berjejer: <b>4 Pasang (8 kartu)</b> untuk kilat, <b>6 Pasang (12 kartu)</b> standar kelas, <b>8 Pasang (16 kartu)</b> tantangan, dan <b>10 Pasang (20 kartu)</b> komprehensif.", body_style)
        ],
        [
            Paragraph("<b>5</b>", badge_style),
            Paragraph("<b>Pengaturan Waktu (Timer)</b>", body_style),
            Paragraph("Preset durasi: <b>3 Menit</b> (kilat), <b>5 Menit</b> (standar), <b>7 Menit</b> (mendalam), <b>10 Menit</b> (diskusi kelompok), atau opsi <b>Bebas</b> (tanpa batas waktu).", body_style)
        ],
        [
            Paragraph("<b>6</b>", badge_style),
            Paragraph("<b>Tingkat Kognitif Bloom</b>", body_style),
            Paragraph("Kartu gradient gamified: <b>Mudah (C1-C2)</b> mengingat fakta dasar; <b>Sedang (C3-C4)</b> penerapan rumus & sebab-akibat; <b>HOTS (C4-C6)</b> evaluasi & pemecahan masalah kritis.", body_style)
        ]
    ]
    t_prep = Table(step_prep, colWidths=[35, 150, 330])
    t_prep.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (0, 1), (0, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_prep)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Mekanisme Arena Kartu & Anti-Kecurangan", h1_style))
    story.append(Paragraph(
        "• <b>Papan 2 Kolom Seimbang:</b> Kolom kiri kartu soal (biru) dan kolom kanan kartu kunci jawaban (hijau). Posisi kedua kolom diacak otomatis (*Fisher-Yates shuffle*) pada setiap sesi.<br/>"
        "• <b>Dukungan Multimedia Gambar:</b> Kartu dapat memuat gambar diagram/spesimen untuk soal visual IPA atau matematika.<br/>"
        "• <b>Proteksi Anti-Tebak Acak:</b> Murid tidak bisa langsung melihat apakah jawabannya benar/salah sebelum melewati jendela popup <b>Wajib Berargumentasi</b>.<br/>"
        "• <b>Audio Synthesized & Confetti:</b> Dilengkapi efek suara interaktif Web Audio API (detak jam 10 detik terakhir, klik kartu, sfx tepuk tangan apresiasi saat benar, dan sfx zonk ramah saat salah).",
        body_style
    ))

    story.append(PageBreak())

    # =========================================================================
    # HALAMAN 3: MODAL ARGUMENTASI, FEEDBACK & RUMUS FORMULA 4 PILAR
    # =========================================================================
    story.append(Paragraph("FITUR ARGUMENTASI MULTIMEDIA & PENILAIAN", title_style))
    story.append(Paragraph(
        "Keunggulan utama SD Match dibandingkan game kuis biasa terletak pada integrasi <b>Teknologi Rekaman Suara Web Audio (Voice Note)</b> langsung di browser siswa tanpa perlu aplikasi pihak ketiga.",
        body_style
    ))
    story.append(Spacer(1, 6))

    modal_info = [
        [
            Paragraph("<b>Alur Argumentasi Voice Note</b>", ParagraphStyle('M1', parent=body_style, fontName='Helvetica-Bold', textColor=DARK_EMERALD)),
            Paragraph("<b>Alur Argumentasi Teks & Pembahasan</b>", ParagraphStyle('M2', parent=body_style, fontName='Helvetica-Bold', textColor=DARK_EMERALD))
        ],
        [
            Paragraph(
                "1. Murid menekan tombol mikrofon merah untuk merekam.<br/>"
                "2. Timer suara berjalan secara *real-time* dengan visual animasi pulsa.<br/>"
                "3. Selesai merekam, audio tersimpan dalam format WebM/WAV dan murid dapat memutar ulang (*preview*) suara mereka sebelum dikunci.<br/>"
                "4. Rekaman diunggah otomatis ke cloud storage aman dan dapat didengarkan oleh guru di dashboard asesmen.",
                body_style
            ),
            Paragraph(
                "1. Bagi perangkat tanpa mikrofon, murid dapat beralih ke tab <i>Input Teks</i>.<br/>"
                "2. Validasi minimal 3 karakter guna memastikan siswa menuliskan alasan logis.<br/>"
                "3. Setelah diverifikasi, modal <i>Feedback Edukatif</i> menampilkan alasan ilmiah lengkap mengapa pasangan tersebut benar.<br/>"
                "4. Membiasakan budaya literasi sains dan refleksi belajar mandiri.",
                body_style
            )
        ]
    ]
    t_modal = Table(modal_info, colWidths=[255, 260])
    t_modal.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t_modal)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Formula Standar Penilaian 4 Pilar SD Match (Skala 100%)", h1_style))
    story.append(Paragraph(
        "Sistem menerapkan bobot penilaian holistik yang adil, menggabungkan akurasi kognitif, literasi argumen, keaktifan, dan manajemen waktu:",
        body_style
    ))
    story.append(Spacer(1, 4))

    rumus_data = [
        [Paragraph("<b>Komponen Nilai</b>", body_bold), Paragraph("<b>Bobot</b>", body_bold), Paragraph("<b>Metode Perhitungan Sistem</b>", body_bold), Paragraph("<b>Tujuan Pedagogis</b>", body_bold)],
        [
            Paragraph("<b>Ketepatan Pasangan</b>", body_style),
            Paragraph("<b>40%</b>", ParagraphStyle('B1', parent=body_style, textColor=ACCENT_BLUE, fontName='Helvetica-Bold')),
            Paragraph("<code>(Kartu Benar / Total Pasangan) × 100</code>", body_style),
            Paragraph("Mengukur penguasaan materi inti kurikulum.", body_style)
        ],
        [
            Paragraph("<b>Kualitas Argumentasi</b>", body_style),
            Paragraph("<b>30%</b>", ParagraphStyle('B2', parent=body_style, textColor=GOLD_ACCENT, fontName='Helvetica-Bold')),
            Paragraph("Skor awal sistem 85 (Voice) / 80 (Teks), dapat dikoreksi manual oleh Guru.", body_style),
            Paragraph("Melatih nalar kritis dan keberanian berbicara.", body_style)
        ],
        [
            Paragraph("<b>Aktivitas Partisipasi</b>", body_style),
            Paragraph("<b>20%</b>", ParagraphStyle('B3', parent=body_style, textColor=colors.HexColor("#7C3AED"), fontName='Helvetica-Bold')),
            Paragraph("<code>(Pasangan Tuntas / Total Soal) × 100</code>", body_style),
            Paragraph("Menilai ketuntasan dan kegigihan murid.", body_style)
        ],
        [
            Paragraph("<b>Ketepatan Waktu</b>", body_style),
            Paragraph("<b>10%</b>", ParagraphStyle('B4', parent=body_style, textColor=PRIMARY_EMERALD, fontName='Helvetica-Bold')),
            Paragraph("<code>((Waktu Maks - Waktu Dipakai) / Waktu Maks) × 100</code>", body_style),
            Paragraph("Apresiasi efisiensi dan kecepatan berpikir.", body_style)
        ]
    ]
    t_rumus = Table(rumus_data, colWidths=[120, 45, 190, 160])
    t_rumus.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_rumus)
    story.append(Spacer(1, 6))

    # Predikat Penilaian
    story.append(Paragraph(
        "<b>Predikat Nilai Kelulusan Siswa:</b><br/>"
        "• <b>Skor ≥ 85:</b> <i>Sangat Memuaskan (Mumtaz)</i> — Penguasaan materi luar biasa dan argumen sangat tajam.<br/>"
        "• <b>Skor 70 – 84:</b> <i>Memuaskan (Jayyid Jiddan)</i> — Memenuhi standar kompetensi capaian pembelajaran.<br/>"
        "• <b>Skor &lt; 70:</b> <i>Terus Belajar & Berlatih</i> — Direkomendasikan remedial atau pengulangan di tingkat yang lebih mudah.",
        body_style
    ))

    story.append(PageBreak())

    # =========================================================================
    # HALAMAN 4: PORTAL KHUSUS GURU & FASILITATOR (4 TAB UTAMA)
    # =========================================================================
    story.append(Paragraph("PORTAL GURU, BANK SOAL & ASESMEN", title_style))
    story.append(Paragraph(
        "Aplikasi menyediakan portal khusus guru dan fasilitator yang dilindungi autentikasi email & kata sandi resmi (tanpa celah demo terbuka). Guru memiliki wewenang penuh atas konten dan evaluasi:",
        body_style
    ))
    story.append(Spacer(1, 6))

    tab_data = [
        [
            Paragraph("<b>Tab Dashboard Guru</b>", body_bold),
            Paragraph("<b>Fitur & Fungsi Utama</b>", body_bold),
            Paragraph("<b>Manfaat Operasional Sekolah</b>", body_bold)
        ],
        [
            Paragraph("<b>1. Bank Soal (CRUD)</b>", body_style),
            Paragraph(
                "• Tambah, Edit, dan Hapus pasangan soal & jawaban kartu.<br/>"
                "• Upload gambar spesimen soal/jawaban.<br/>"
                "• Pemetaan tingkat kognitif Bloom (Easy, Medium, HOTS).<br/>"
                "• Filter pencarian teks cepat dan status aktif soal.",
                body_style
            ),
            Paragraph("Guru leluasa memperkaya variasi soal madrasah setiap minggu.", body_style)
        ],
        [
            Paragraph("<b>2. Kelola Mata Pelajaran & Materi</b>", body_style),
            Paragraph(
                "• Tambah & edit nama mapel, ikon emoji, dan deskripsi.<br/>"
                "• Tambah daftar materi pokok per baris atau inline chips.<br/>"
                "• Menyesuaikan bab kurikulum terbaru dengan cepat.",
                body_style
            ),
            Paragraph("Dapat digunakan untuk semua mapel umum maupun keagamaan Kemenag.", body_style)
        ],
        [
            Paragraph("<b>3. Assessment Report & Audio</b>", body_style),
            Paragraph(
                "• Rekap nilai otomatis seluruh siswa dan kelompok.<br/>"
                "• Pemutar audio terintegrasi untuk mendengarkan VN murid.<br/>"
                "• Fitur revisi nilai argumentasi (0-100) dan catatan guru.<br/>"
                "• <b>Ekspor Laporan Excel/CSV</b> sekali klik siap cetak.",
                body_style
            ),
            Paragraph("Dokumen asesmen siap diserahkan ke kepala madrasah dan wali murid.", body_style)
        ],
        [
            Paragraph("<b>4. Pengaturan Sesi & Timer</b>", body_style),
            Paragraph(
                "• Atur kode ruangan kelas (contoh: <code>MIN1-ENDE</code>).<br/>"
                "• Pengaturan standar waktu per tingkat kognitif.<br/>"
                "• Sinkronisasi otomatis ke tampilan murid.",
                body_style
            ),
            Paragraph("Menjaga keteraturan sesi ujian serentak dalam satu kelas.", body_style)
        ]
    ]
    t_tab = Table(tab_data, colWidths=[120, 245, 150])
    t_tab.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_tab)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Format Ekspor Laporan Penilaian (CSV/Excel)", h1_style))
    story.append(Paragraph(
        "File hasil unduhan dari tab Assessment Report memuat kolom data lengkap dan terstandarisasi:<br/>"
        "<code>No | Nama Murid | Kelas | Tingkat Kognitif | Kode Room | Total Soal | Pasangan Tepat | Waktu Selesai | Ketepatan (40%) | Argumentasi (30%) | Aktivitas (20%) | Waktu (10%) | Nilai Akhir (100%) | Status | Tanggal Main</code>",
        body_style
    ))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "Laporan ini dapat langsung diimpor ke aplikasi e-Rapor Madrasah Kemenag atau Microsoft Excel untuk pengolahan nilai semester.",
        body_style
    ))

    story.append(PageBreak())

    # =========================================================================
    # HALAMAN 5: ARSITEKTUR TEKNOLOGI, ROADMAP & KESIAPAN IMPLEMENTASI
    # =========================================================================
    story.append(Paragraph("SPESIFIKASI TEKNOLOGI & IMPLEMENTASI", title_style))
    story.append(Paragraph(
        "Aplikasi dibangun menggunakan standar rekayasa perangkat lunak modern untuk menjamin kecepatan, kehandalan, dan keamanan data madrasah:",
        body_style
    ))
    story.append(Spacer(1, 6))

    tech_data = [
        [Paragraph("<b>Komponen Sistem</b>", body_bold), Paragraph("<b>Teknologi yang Digunakan</b>", body_bold), Paragraph("<b>Keunggulan Teknis</b>", body_bold)],
        [
            Paragraph("Frontend Framework", body_style),
            Paragraph("Next.js 16 (App Router) + React 19", body_style),
            Paragraph("Performa kilat dengan Turbopack compiler, SEO optimal, dan rendering instan.", body_style)
        ],
        [
            Paragraph("Sistem Bahasa", body_style),
            Paragraph("TypeScript 100% Type-Safe", body_style),
            Paragraph("Bebas error runtime variabel, integritas data terjamin tinggi.", body_style)
        ],
        [
            Paragraph("Desain Antarmuka", body_style),
            Paragraph("Tailwind CSS v4 + Framer Motion", body_style),
            Paragraph("Responsif mobile-first, animasi kartu mulus, tema Light & Dark Mode kontras tinggi.", body_style)
        ],
        [
            Paragraph("Backend & Database", body_style),
            Paragraph("Supabase PostgreSQL Cloud", body_style),
            Paragraph("Database relasional tangguh, autentikasi aman, dan storage media bucket.", body_style)
        ],
        [
            Paragraph("Mode Offline / Fallback", body_style),
            Paragraph("LocalStorage & Web Cache Engine", body_style),
            Paragraph("<b>Fitur Unggulan:</b> Jika jaringan internet madrasah tidak stabil, aplikasi otomatis beralih ke cache lokal tanpa menghentikan permainan murid.", body_style)
        ],
        [
            Paragraph("Identitas & Branding", body_style),
            Paragraph("Logo Resmi MIN 1 Ende (WebP HD)", body_style),
            Paragraph("Terpasang di Favicon, Navbar, Header Persiapan, Banner Guru, Trofi Hasil, dan Footer.", body_style)
        ]
    ]
    t_tech = Table(tech_data, colWidths=[110, 160, 245])
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_tech)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Langkah Sosialisasi & Panduan Penerapan di Kelas", h1_style))
    story.append(Paragraph(
        "<b>1. Pembagian Perangkat:</b> Guru dapat menggunakan 1 proyektor di depan kelas untuk turnamen kelompok, atau meminta siswa membuka website melalui HP/Tablet/Chromebook masing-masing.<br/>"
        "<b>2. Pelaksanaan Sesi:</b> Guru mengumumkan kode room (misal: <code>MIN1-ENDE</code>) dan materi yang akan dimainkan hari ini.<br/>"
        "<b>3. Verifikasi Argumentasi:</b> Dorong murid untuk menggunakan fitur Voice Note agar membiasakan berbicara dengan artikulasi dan nalar logis.<br/>"
        "<b>4. Evaluasi Bersama:</b> Di akhir sesi, guru membuka tab <i>Assessment Report</i>, memutar beberapa rekaman audio terbaik di depan kelas, dan memberikan apresiasi.",
        body_style
    ))
    story.append(Spacer(1, 8))

    # Lembar Pengesahan / Kontak
    sign_data = [
        [
            Paragraph("<b>Disiapkan Untuk:</b><br/>Madrasah Ibtidaiyah Negeri (MIN) 1 Ende<br/>Kabupaten Ende, Nusa Tenggara Timur", body_style),
            Paragraph("<b>Status Sistem:</b><br/>Ready for Production (Build Verified Code 0)<br/>Tanggal: 24 November 2026", ParagraphStyle('SRight', parent=body_style, alignment=2))
        ]
    ]
    t_sign = Table(sign_data, colWidths=[255, 260])
    t_sign.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, -1), 1, PRIMARY_EMERALD),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_sign)

    # Build PDF
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF berhasil dibuat: {filename}")

if __name__ == "__main__":
    build_pdf()
