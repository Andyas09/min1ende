/**
 * SD MATCH (Smart Digital Make A Match) - MIN 1 ENDE
 * Voice Recorder Utility: Perekaman Suara Murid via Web Audio / MediaRecorder API
 */

export interface VoiceRecordingResult {
  blob: Blob;
  url: string;
  durationSeconds: number;
  mimeType: string;
}

export class VoiceRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime: number = 0;
  private timerInterval: any = null;

  /**
   * Cek apakah browser mendukung perekaman suara
   */
  public static isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      navigator.mediaDevices !== undefined &&
      typeof navigator.mediaDevices.getUserMedia === "function" &&
      typeof window.MediaRecorder !== "undefined"
    );
  }

  /**
   * Mulai perekaman suara murid
   */
  public async startRecording(
    onTick?: (seconds: number) => void
  ): Promise<boolean> {
    if (!VoiceRecorderService.isSupported()) {
      throw new Error("Browser Anda belum mendukung perekaman suara (MediaRecorder).");
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Tentukan format audio yang didukung browser
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        mimeType = "audio/ogg;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      }

      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.startTime = Date.now();
      this.mediaRecorder.start(200); // Kumpulkan data setiap 200ms

      if (onTick) {
        this.timerInterval = setInterval(() => {
          const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
          onTick(elapsed);
        }, 1000);
      }

      return true;
    } catch (err: any) {
      this.cleanup();
      console.error("Gagal memulai rekaman suara:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        throw new Error("Izin akses mikrofon ditolak. Mohon aktifkan izin mikrofon di browser Anda.");
      }
      throw new Error(err.message || "Gagal mengakses mikrofon.");
    }
  }

  /**
   * Hentikan perekaman dan dapatkan file Blob rekaman suara
   */
  public async stopRecording(): Promise<VoiceRecordingResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
        this.cleanup();
        reject(new Error("Tidak ada perekaman suara yang sedang aktif."));
        return;
      }

      const durationSeconds = Math.max(1, Math.floor((Date.now() - this.startTime) / 1000));
      const mimeType = this.mediaRecorder.mimeType || "audio/webm";

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);

        this.cleanup();

        resolve({
          blob: audioBlob,
          url: audioUrl,
          durationSeconds,
          mimeType,
        });
      };

      try {
        this.mediaRecorder.stop();
      } catch (err) {
        this.cleanup();
        reject(err);
      }
    });
  }

  /**
   * Batalkan perekaman tanpa menyimpan
   */
  public cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
}

