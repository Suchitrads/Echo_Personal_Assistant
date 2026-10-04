/**
 * Audio processing utilities for Gemini Live real-time voice streaming.
 */

// Downsamples any input Float32Array audio to 16,000Hz 16-bit PCM for Gemini Live
export function downsampleTo16kPCM(
  inputData: Float32Array,
  inputSampleRate: number
): { pcmData: ArrayBuffer; base64: string } {
  const targetSampleRate = 16000;
  if (inputSampleRate === targetSampleRate) {
    const buffer = new ArrayBuffer(inputData.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < inputData.length; i++) {
      const s = Math.max(-1, Math.min(1, inputData[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return { pcmData: buffer, base64: arrayBufferToBase64(buffer) };
  }

  const sampleRatio = inputSampleRate / targetSampleRate;
  const newLength = Math.round(inputData.length / sampleRatio);
  const result = new Int16Array(newLength);

  let offsetResult = 0;
  let offsetInput = 0;

  while (offsetResult < result.length) {
    const nextOffsetInput = Math.round((offsetResult + 1) * sampleRatio);
    let accum = 0;
    let count = 0;
    for (let i = offsetInput; i < nextOffsetInput && i < inputData.length; i++) {
      accum += inputData[i];
      count++;
    }
    const avg = count > 0 ? accum / count : 0;
    const clamped = Math.max(-1, Math.min(1, avg));
    result[offsetResult] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    offsetResult++;
    offsetInput = nextOffsetInput;
  }

  const base64 = arrayBufferToBase64(result.buffer);
  return { pcmData: result.buffer, base64 };
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * AudioPlayer handles seamless, gapless streaming playback of 24kHz raw PCM or WAV audio
 * from Gemini Live, while analyzing audio energy for waveforms and panda animations.
 */
export class StreamingAudioPlayer {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private nextPlayTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private onEndedCallback?: () => void;

  constructor() {
    // Lazily initialized on first user interaction
  }

  private initContext() {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      try {
        this.audioCtx = new AudioContextClass({ sampleRate: 24000 });
      } catch {
        this.audioCtx = new AudioContextClass();
      }
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.6;
      this.analyser.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  public setOnEnded(callback: () => void) {
    this.onEndedCallback = callback;
  }

  public resume(): void {
    this.initContext();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  /**
   * Enqueues a base64 24kHz 16-bit PCM chunk from Gemini Live
   */
  public enqueuePCMChunk(base64Pcm: string) {
    this.initContext();
    if (!this.audioCtx || !this.analyser) return;

    try {
      const arrayBuffer = base64ToArrayBuffer(base64Pcm);
      const int16Array = new Int16Array(arrayBuffer);
      if (int16Array.length === 0) return;

      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = this.audioCtx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.copyToChannel(float32Array, 0);

      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.analyser);

      const currentTime = this.audioCtx.currentTime;
      const startTime = Math.max(currentTime, this.nextPlayTime);
      source.start(startTime);
      this.nextPlayTime = startTime + audioBuffer.duration;

      this.activeSources.push(source);

      source.onended = () => {
        const index = this.activeSources.indexOf(source);
        if (index > -1) {
          this.activeSources.splice(index, 1);
        }
        if (this.activeSources.length === 0 && this.audioCtx && this.audioCtx.currentTime >= this.nextPlayTime - 0.05) {
          this.onEndedCallback?.();
        }
      };
    } catch {
      // Chunk decode skipped cleanly
    }
  }

  /**
   * Plays a complete audio URL / base64 data URL (e.g. data:audio/wav;base64,...)
   */
  public async playDataUrl(dataUrl: string): Promise<void> {
    this.initContext();
    if (!this.audioCtx || !this.analyser) return;

    try {
      const response = await fetch(dataUrl);
      const arrayBuffer = await response.arrayBuffer();
      const decodedBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);

      this.stop(); // Stop any previous playback

      const source = this.audioCtx.createBufferSource();
      source.buffer = decodedBuffer;
      source.connect(this.analyser);

      source.start(0);
      this.activeSources.push(source);

      source.onended = () => {
        const index = this.activeSources.indexOf(source);
        if (index > -1) {
          this.activeSources.splice(index, 1);
        }
        this.onEndedCallback?.();
      };
    } catch {
      // Audio playback finished or superseded
      this.onEndedCallback?.();
    }
  }

  /**
   * Immediately stops all audio output and clears queued chunks (for conversational interruption)
   */
  public stop() {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Ignore already stopped
      }
    }
    this.activeSources = [];
    if (this.audioCtx) {
      this.nextPlayTime = this.audioCtx.currentTime;
    }
  }

  /**
   * Returns normalized RMS amplitude [0.0, 1.0] of currently playing audio
   */
  public getAudioLevel(): number {
    if (!this.analyser || this.activeSources.length === 0) return 0;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    return Math.min(1, avg / 128);
  }

  public isPlaying(): boolean {
    return this.activeSources.length > 0;
  }

  public close() {
    this.stop();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch {}
    }
    this.audioCtx = null;
    this.analyser = null;
  }
}
