/** Encode browser recording to 16 kHz mono 16-bit PCM WAV for Whisper. */
export async function encodeBlobTo16kMonoWav(
  blob: Blob,
  options?: { trimStartSec?: number; trimEndSec?: number }
): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  if (!arrayBuffer.byteLength) {
    throw new Error('Empty audio blob');
  }

  const decodeCtx = new AudioContext();
  try {
    const decoded = await decodeCtx.decodeAudioData(arrayBuffer.slice(0));
    const targetRate = 16000;
    const length = Math.max(1, Math.ceil(decoded.duration * targetRate));
    const offline = new OfflineAudioContext(1, length, targetRate);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start(0);
    const rendered = await offline.startRendering();
    const full = rendered.getChannelData(0);

    const trimStart = Math.max(0, Math.floor((options?.trimStartSec ?? 0) * targetRate));
    const trimEnd =
      options?.trimEndSec != null
        ? Math.min(full.length, Math.ceil(options.trimEndSec * targetRate))
        : full.length;
    const slice =
      trimStart > 0 || trimEnd < full.length
        ? full.subarray(trimStart, Math.max(trimStart + 1, trimEnd))
        : full;

    const pcm = floatTo16BitPcm(slice);
    return new Blob([pcmToWav(pcm, targetRate)], { type: 'audio/wav' });
  } finally {
    await decodeCtx.close().catch(() => undefined);
  }
}

function floatTo16BitPcm(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function pcmToWav(pcm: Int16Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, pcm.length * 2, true);

  let offset = 44;
  for (let i = 0; i < pcm.length; i++, offset += 2) {
    view.setInt16(offset, pcm[i], true);
  }
  return buffer;
}
