import { normalizeInterviewLanguage, type InterviewLanguageCode } from '@/lib/interviewLanguages';

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

function snippet(answer: string, maxWords = 10): string {
  const words = answer.trim().split(/\s+/).filter(Boolean).slice(0, maxWords);
  if (!words.length) return '';
  const text = words.join(' ');
  return text.length > 90 ? `${text.slice(0, 87).trim()}…` : text;
}

/** Quick verbal nod right when recording stops (before STT finishes). */
export function instantAckPhrase(lang: string): string {
  const code = normalizeInterviewLanguage(lang);
  const phrases: Record<InterviewLanguageCode, string[]> = {
    'en-US': ['Mm-hmm, got it.', 'Okay, thank you.', 'Right, I hear you.'],
    es: ['Entendido, gracias.', 'De acuerdo.', 'Gracias, te escucho.'],
    fr: ['D\'accord, merci.', 'Je vous entends.', 'Très bien, merci.'],
    de: ['Alles klar, danke.', 'Verstanden.', 'Danke, ich höre Sie.'],
    hi: ['हाँ, समझ गया।', 'ठीक है, धन्यवाद।', 'जी, सुन लिया।'],
    ar: ['حسناً، شكراً.', 'فهمت، شكراً.', 'سمعتك.'],
    ur: ['جی، سمجھ گیا۔', 'ٹھیک ہے، شکریہ۔', 'جی بالکل، سن لیا۔'],
  };
  return pick(phrases[code] ?? phrases['en-US']);
}

/** Personalized ack once we know what the candidate said — feels like a real interviewer. */
export function reflectiveAckPhrase(answer: string, lang: string, interviewerName = 'Ethan'): string {
  const code = normalizeInterviewLanguage(lang);
  const part = snippet(answer);
  if (!part) return instantAckPhrase(lang);

  const templates: Record<InterviewLanguageCode, string[]> = {
    'en-US': [
      `Thanks — especially what you said about "${part}". Give me just a moment.`,
      `That's helpful about "${part}". Let me think of a good follow-up.`,
      `I appreciate that detail on "${part}". One second.`,
    ],
    es: [
      `Gracias — sobre todo lo de "${part}". Un momento.`,
      `Muy útil lo de "${part}". Déjame pensar la siguiente pregunta.`,
    ],
    fr: [
      `Merci — surtout pour "${part}". Un instant.`,
      `C'est clair pour "${part}". Je prépare la suite.`,
    ],
    de: [
      `Danke — besonders zu "${part}". Einen Moment.`,
      `Das hilft zu "${part}". Ich denke kurz nach.`,
    ],
    hi: [
      `"${part}" — यह अच्छा था। एक पल दीजिए।`,
      `धन्यवाद, "${part}" पर जो बताया — समझ गया।`,
    ],
    ar: [
      `شكراً — خاصة ما ذكرته عن "${part}". لحظة.`,
      `مفيد ما قلته عن "${part}". لحظة من فضلك.`,
    ],
    ur: [
      `"${part}" — یہ اچھا point تھا۔ بس ایک لمحہ دیں۔`,
      `شکریہ، "${part}" کے بارے میں جو بتایا — سمجھ آ گیا۔`,
      `جی، "${part}" — ${interviewerName} سوچ رہا ہے اگلا سوال۔`,
    ],
  };
  return pick(templates[code] ?? templates['en-US']);
}

/** Spoken if the next question takes a few seconds — keeps the room alive. */
export function spokenBridgePhrase(lang: string, interviewerName = 'Ethan'): string {
  const code = normalizeInterviewLanguage(lang);
  const phrases: Record<InterviewLanguageCode, string[]> = {
    'en-US': [
      `Still with you — ${interviewerName} here, lining up the next question.`,
      'One moment — I want to ask something that builds on what you shared.',
      'Bear with me — almost ready for the next one.',
    ],
    es: ['Sigo aquí — preparo la siguiente pregunta.', 'Un momento, casi listo.'],
    fr: ['Je suis toujours là — j\'affine la question suivante.', 'Un instant.'],
    de: ['Bin noch da — nächste Frage kommt gleich.', 'Einen Moment bitte.'],
    hi: ['मैं यहीं हूँ — अगला सवाल तैयार हो रहा है।', 'बस एक पल।'],
    ar: ['ما زلت معك — أجهّز السؤال التالي.', 'لحظة من فضلك.'],
    ur: [
      `میں یہیں ہوں — ${interviewerName} اگلا سوال سوچ رہا ہے۔`,
      'ذرا ایک لمحہ — آپ کے جواب سے جڑا اگلا سوال تیار کر رہا ہوں۔',
      'بس تھوڑی دیر — تقریباً تیار ہے۔',
    ],
  };
  return pick(phrases[code] ?? phrases['en-US']);
}

/** On-screen status — warm, not technical. */
export function humanStatusLabel(
  lang: string,
  phase: 'idle' | 'listening' | 'openingMic' | 'thinking' | 'speaking',
  interviewerName: string
): string {
  const code = normalizeInterviewLanguage(lang);
  const labels: Record<InterviewLanguageCode, Record<typeof phase, string>> = {
    'en-US': {
      idle: `${interviewerName} is ready for your answer`,
      listening: `${interviewerName} is listening…`,
      openingMic: `Opening your microphone…`,
      thinking: `${interviewerName} is reflecting on your answer…`,
      speaking: `${interviewerName} is speaking…`,
    },
    es: {
      idle: `${interviewerName} espera tu respuesta`,
      listening: `${interviewerName} te escucha…`,
      openingMic: 'Abriendo tu micrófono…',
      thinking: `${interviewerName} reflexiona sobre tu respuesta…`,
      speaking: `${interviewerName} habla…`,
    },
    fr: {
      idle: `${interviewerName} attend votre réponse`,
      listening: `${interviewerName} vous écoute…`,
      openingMic: 'Ouverture de votre micro…',
      thinking: `${interviewerName} réfléchit à votre réponse…`,
      speaking: `${interviewerName} parle…`,
    },
    de: {
      idle: `${interviewerName} wartet auf Ihre Antwort`,
      listening: `${interviewerName} hört zu…`,
      openingMic: 'Mikrofon wird geöffnet…',
      thinking: `${interviewerName} denkt über Ihre Antwort nach…`,
      speaking: `${interviewerName} spricht…`,
    },
    hi: {
      idle: `${interviewerName} आपके जवाब का इंतज़ार कर रहे हैं`,
      listening: `${interviewerName} सुन रहे हैं…`,
      openingMic: 'माइक्रोफ़ोन खोला जा रहा है…',
      thinking: `${interviewerName} आपके जवाब पर सोच रहे हैं…`,
      speaking: `${interviewerName} बोल रहे हैं…`,
    },
    ar: {
      idle: `${interviewerName} بانتظار إجابتك`,
      listening: `${interviewerName} يستمع…`,
      openingMic: 'جاري فتح الميكروفون…',
      thinking: `${interviewerName} يفكر في إجابتك…`,
      speaking: `${interviewerName} يتحدث…`,
    },
    ur: {
      idle: `${interviewerName} آپ کے جواب کا انتظار کر رہا ہے`,
      listening: `${interviewerName} سن رہا ہے…`,
      openingMic: 'مائیکروفون کھولا جا رہا ہے…',
      thinking: `${interviewerName} آپ کے جواب پر غور کر رہا ہے…`,
      speaking: `${interviewerName} بول رہا ہے…`,
    },
  };
  const map = labels[code] ?? labels['en-US'];
  return map[phase];
}

/** Rotating subtext while waiting (shown under the human label). */
export function waitingEngagementMessages(lang: string): string[] {
  const code = normalizeInterviewLanguage(lang);
  const messages: Record<InterviewLanguageCode, string[]> = {
    'en-US': [
      'Take your time — I’m still here.',
      'Thinking about what you shared…',
      'Almost ready to continue our conversation.',
    ],
    es: ['Tómate tu tiempo — sigo aquí.', 'Pensando en lo que compartiste…'],
    fr: ['Prenez votre temps — je suis là.', 'Je réfléchis à ce que vous avez dit…'],
    de: ['Kein Stress — ich bin da.', 'Denke über Ihre Antwort nach…'],
    hi: ['आराम से — मैं यहीं हूँ।', 'आपके जवाब पर सोच रहा हूँ…'],
    ar: ['خذ وقتك — ما زلت هنا.', 'أفكر في ما شاركته…'],
    ur: [
      'آرام سے — میں یہیں ہوں۔',
      'آپ نے جو بتایا اس پر سوچ رہا ہوں…',
      'بات چیت جاری رکھیں گے، بس ایک لمحہ۔',
    ],
  };
  return messages[code] ?? messages['en-US'];
}
