import { normalizeInterviewLanguage, type InterviewLanguageCode } from '@/lib/interviewLanguages';

/** Immediate ack when the candidate finishes speaking — plays before STT returns. */
export function instantAckPhrase(lang: string): string {
  const code = normalizeInterviewLanguage(lang);
  const phrases: Record<InterviewLanguageCode, string[]> = {
    'en-US': ['Thanks for that.', 'Got it — one moment.', 'Thank you, noted.'],
    es: ['Gracias.', 'Entendido, un momento.', 'Gracias por tu respuesta.'],
    fr: ['Merci.', 'Compris, un instant.', 'Merci pour votre réponse.'],
    de: ['Danke.', 'Verstanden, einen Moment.', 'Danke für Ihre Antwort.'],
    hi: ['धन्यवाद।', 'समझ गया, एक पल।', 'आपके जवाब के लिए धन्यवाद।'],
    ar: ['شكراً.', 'فهمت، لحظة واحدة.', 'شكراً على إجابتك.'],
    ur: ['شکریہ۔', 'سمجھ گیا، ایک لمحہ۔', 'آپ کے جواب کا شکریہ۔'],
  };
  const list = phrases[code] ?? phrases['en-US'];
  return list[Math.floor(Math.random() * list.length)]!;
}

/** Rotates while STT + AI prepare the next question — keeps the candidate engaged. */
export function waitingEngagementMessages(lang: string): string[] {
  const code = normalizeInterviewLanguage(lang);
  const messages: Record<InterviewLanguageCode, string[]> = {
    'en-US': [
      'Reviewing your answer…',
      'Preparing the next question…',
      'Still with you — almost ready.',
      'Take a breath while I line up the next topic.',
    ],
    es: [
      'Revisando tu respuesta…',
      'Preparando la siguiente pregunta…',
      'Sigo contigo — casi listo.',
    ],
    fr: [
      'J\'examine votre réponse…',
      'Je prépare la question suivante…',
      'Je suis toujours là — presque prêt.',
    ],
    de: [
      'Ich gehe Ihre Antwort durch…',
      'Nächste Frage wird vorbereitet…',
      'Bin gleich wieder da.',
    ],
    hi: [
      'आपका जवाब देख रहा हूँ…',
      'अगला सवाल तैयार हो रहा है…',
      'बस एक पल…',
    ],
    ar: [
      'أراجع إجابتك…',
      'أجهّز السؤال التالي…',
      'معك — تقريباً جاهز.',
    ],
    ur: [
      'آپ کا جواب دیکھ رہا ہوں…',
      'اگلا سوال تیار ہو رہا ہے…',
      'میں یہیں ہوں — بس ایک لمحہ۔',
      'تھوڑا سا انتظار کریں، جلد آگے بڑھتے ہیں۔',
    ],
  };
  return messages[code] ?? messages['en-US'];
}
