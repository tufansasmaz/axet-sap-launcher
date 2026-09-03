// Composer mikrofonunun KAYIT yarısı. Tanıma tarafı main process'te
// (app-electron/main/dictation.ts), gömülü whisper.cpp ile.
//
// Neden `MediaRecorder` değil: MediaRecorder Chromium'da WebM/Opus üretiyor,
// whisper-cli ise yalnızca flac/mp3/ogg/wav okuyor (`--help` ile doğrulandı).
// Araya bir ffmpeg koymak, sırf format çevirmek için ~80MB'lik ikinci bir
// ikili paketlemek demekti. Ham PCM'i AudioContext'ten alıp WAV başlığını
// burada yazmak birkaç satır tutuyor ve hiçbir şey paketlemiyor.
//
// Örnekleme hızı 16kHz SABİT: whisper modelleri 16kHz mono ile eğitilmiş,
// başka bir hızla beslersen whisper zaten kendi içinde yeniden örnekliyor.
// AudioContext'e doğrudan 16000 vermek bu işi tarayıcının (kaliteli) yeniden
// örnekleyicisine bırakıyor.
const SAMPLE_RATE = 16000;

// ScriptProcessorNode "deprecated" ama Electron'da çalışıyor ve tek dosyada
// duruyor. AudioWorklet doğru halefi, ancak ayrı bir worklet modül dosyası
// + `audioWorklet.addModule()` yolu gerektiriyor; bu, Vite'ın dev/prod yol
// çözümüyle uğraşmak demek. Dikte için ses işleme yükü ihmal edilebilir
// olduğundan basit olan tercih edildi.
const BUFFER_SIZE = 4096;

export interface DictationRecording {
  // WAV içeriği base64 — IPC üzerinden binary geçirmenin en az sürprizli yolu.
  base64: string;
  durationMs: number;
}

export class DictationRecorder {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private chunks: Float32Array[] = [];
  private startedAt = 0;

  get recording(): boolean {
    return this.processor !== null;
  }

  async start(): Promise<void> {
    if (this.recording) return;
    // Mikrofon izni: Electron'da `setPermissionRequestHandler` tanımlı
    // olmadığında getUserMedia varsayılan olarak İZİN VERİLMİŞ sayılıyor,
    // yani ayrıca bir izin diyaloğu çıkmıyor. Yine de cihaz yoksa/kullanımdaysa
    // burası atıyor ve çağıran hatayı kullanıcıya gösteriyor.
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        // Tarayıcının kendi ön işlemesi AÇIK: dikte tek bir konuşmacının
        // yakın mikrofonundan geliyor, yankı/gürültü bastırma tanıma
        // doğruluğunu artırıyor.
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    this.context = new AudioContext({ sampleRate: SAMPLE_RATE });
    this.source = this.context.createMediaStreamSource(this.stream);
    this.processor = this.context.createScriptProcessor(BUFFER_SIZE, 1, 1);
    this.chunks = [];
    this.startedAt = Date.now();

    this.processor.onaudioprocess = (event) => {
      // `getChannelData` ALTTAKİ tamponu döndürüyor ve bir sonraki çağrıda
      // üzerine yazılıyor — kopyalanmazsa kayıt kendi kendini silen bir
      // tampon yığınına dönüşür.
      this.chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    };

    this.source.connect(this.processor);
    // ScriptProcessor bir hedefe bağlı DEĞİLSE Chromium onu hiç çalıştırmıyor,
    // yani `onaudioprocess` bir kere bile tetiklenmiyor. Destination'a bağlamak
    // sesi hoparlöre de verirdi (kullanıcı kendini duyar, geri besleme olur);
    // araya kazancı sıfır bir kazanç düğümü koyup sessizce bağlıyoruz.
    const mute = this.context.createGain();
    mute.gain.value = 0;
    this.processor.connect(mute);
    mute.connect(this.context.destination);
  }

  // Kaydı bitirir ve WAV'ı döner. `null` = hiç ses yakalanmadı (kullanıcı
  // düğmeye basıp hemen bıraktı) — bu bir hata değil, sessizce yok sayılmalı.
  async stop(): Promise<DictationRecording | null> {
    if (!this.recording) return null;
    const durationMs = Date.now() - this.startedAt;
    const chunks = this.chunks;
    this.cleanup();

    const total = chunks.reduce((sum, c) => sum + c.length, 0);
    if (total === 0) return null;

    const samples = new Float32Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      samples.set(chunk, offset);
      offset += chunk.length;
    }

    return { base64: encodeWavBase64(samples, SAMPLE_RATE), durationMs };
  }

  // Kaydı ATAR. İptalde (Escape) ve bileşen sökülürken çağrılıyor — mikrofonun
  // donanım göstergesi açık kalmasın diye.
  cancel(): void {
    this.cleanup();
    this.chunks = [];
  }

  private cleanup(): void {
    if (this.processor) {
      this.processor.onaudioprocess = null;
      this.processor.disconnect();
      this.processor = null;
    }
    this.source?.disconnect();
    this.source = null;
    // Track'leri durdurmak ŞART: yalnızca AudioContext'i kapatmak Windows'ta
    // mikrofonun "kullanımda" rozetini açık bırakıyor.
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    void this.context?.close().catch(() => {});
    this.context = null;
    this.chunks = [];
  }
}

// Float32 [-1,1] örnekleri 16-bit PCM WAV'a çevirir ve base64 döner.
function encodeWavBase64(samples: Float32Array, sampleRate: number): string {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };

  // Kanonik 44 baytlık WAV başlığı (RIFF/fmt /data), mono PCM16.
  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true); // fmt bloğu uzunluğu
  view.setUint16(20, 1, true); // 1 = PCM
  view.setUint16(22, 1, true); // kanal sayısı
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // bayt/saniye
  view.setUint16(32, bytesPerSample, true); // blok hizası
  view.setUint16(34, 8 * bytesPerSample, true); // bit/örnek
  writeAscii(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    // Kırpma ŞART: tarayıcının otomatik kazancı zaman zaman |1|'i biraz
    // aşan örnekler üretiyor, sınırlanmazsa taşıp cızırtıya dönüşürler.
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += bytesPerSample;
  }

  // Büyük bir Uint8Array'i tek `String.fromCharCode(...arr)` çağrısıyla
  // vermek yığın taşırıyor (5 dakikalık ses ~9.6M örnek) — parça parça.
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
