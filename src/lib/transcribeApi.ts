export interface TranscribeResponse {
  transcript: string;
}

export async function transcribeAudio(file: Blob): Promise<TranscribeResponse> {
  const formData = new FormData();
  formData.append('audio', file, 'uploaded.wav');

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
