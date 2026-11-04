/**
 * Universal In-Browser Audio Recorder for Web & Mobile
 * Captures clean 16kHz Mono PCM Audio and converts to WAV Blob & Base64
 * Compatible with all modern browsers: iOS Safari, Android Chrome, Edge, Firefox
 */

export class AudioRecorder {
  constructor() {
    this.stream = null;
    this.audioContext = null;
    this.processor = null;
    this.source = null;
    this.pcmChunks = [];
    this.totalSamples = 0;
    this.isRecording = false;
  }

  async start() {
    this.pcmChunks = [];
    this.totalSamples = 0;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error('Trình duyệt không hỗ trợ AudioContext.');
    }

    this.audioContext = new AudioContextClass({ sampleRate: 16000 });
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    this.source = this.audioContext.createMediaStreamSource(this.stream);
    // 4096 buffer size gives smooth real-time recording
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const input = e.inputBuffer.getChannelData(0);
      const copy = new Float32Array(input.length);
      copy.set(input);
      this.pcmChunks.push(copy);
      this.totalSamples += copy.length;
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
    this.isRecording = true;
  }

  async stop() {
    this.isRecording = false;

    if (this.source) {
      try { this.source.disconnect(); } catch (_) {}
      this.source = null;
    }
    if (this.processor) {
      try { this.processor.disconnect(); } catch (_) {}
      this.processor = null;
    }
    if (this.stream) {
      try { this.stream.getTracks().forEach(t => t.stop()); } catch (_) {}
      this.stream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { await this.audioContext.close(); } catch (_) {}
    }

    if (this.totalSamples === 0) return null;

    // Merge Float32 chunks
    const merged = new Float32Array(this.totalSamples);
    let offset = 0;
    for (const chunk of this.pcmChunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    // Convert Float32 PCM to 16-bit mono WAV Blob
    const sampleRate = 16000;
    const wavBuffer = new ArrayBuffer(44 + merged.length * 2);
    const view = new DataView(wavBuffer);

    function writeString(view, offset, string) {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + merged.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // Byte rate
    view.setUint16(32, 2, true); // Block align
    view.setUint16(34, 16, true); // Bits per sample
    writeString(view, 36, 'data');
    view.setUint32(40, merged.length * 2, true);

    let idx = 44;
    for (let i = 0; i < merged.length; i++, idx += 2) {
      const s = Math.max(-1, Math.min(1, merged[i]));
      view.setInt16(idx, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    const wavBlob = new Blob([view], { type: 'audio/wav' });
    const audioUrl = URL.createObjectURL(wavBlob);

    // Convert to Base64 for Gemini multimodal API
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        const b64 = typeof dataUrl === 'string' ? dataUrl.split(',')[1] : '';
        resolve(b64);
      };
      reader.readAsDataURL(wavBlob);
    });

    return {
      blob: wavBlob,
      url: audioUrl,
      base64,
      mimeType: 'audio/wav',
      durationSeconds: Math.round(merged.length / sampleRate)
    };
  }
}

export default AudioRecorder;
