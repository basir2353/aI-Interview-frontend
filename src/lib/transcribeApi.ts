export interface TranscribeResponse {
  transcript: string;
}

function filenameForBlob(blob: Blob): string {
  const type = (blob.type || '').toLowerCase();
  if (type.includes('webm')) return 'recording.webm';
  if (type.includes('ogg')) return 'recording.ogg';
  if (type.includes('mp4') || type.includes('aac') || type.includes('mpeg')) return 'recording.mp4';
  if (type.includes('wav')) return 'recording.wav';
  return 'recording.webm';
}

export async function transcribeAudio(file: Blob, filename?: string): Promise<TranscribeResponse> {
  const formData = new FormData();
  formData.append('audio', file, filename || filenameForBlob(file));

  const response = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json().catch(() => ({} as Record<string, unknown>));
  if (!response.ok) {
    const errorMessage =
      typeof payload.error === 'string' && payload.error.trim()
        ? payload.error
        : response.status === 504
          ? 'Transcription timed out. Try a shorter recording or ensure the backend and whisper.cpp are running.'
          : `Transcription failed with status ${response.status}`;
    const details =
      typeof payload.details === 'string' && payload.details.trim()
        ? ` (${payload.details})`
        : '';
    throw new Error(`${errorMessage}${details}`);
  }

  const transcript =
    typeof payload.transcript === 'string' ? payload.transcript : '';

  return { transcript };
}
