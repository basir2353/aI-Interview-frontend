/**
 * Frontend types aligned with backend API responses.
 */

export type InterviewPhase = 'intro' | 'technical' | 'behavioral' | 'wrap_up' | 'coding';

export type InterviewRole = 'technical' | 'behavioral' | 'sales' | 'customer_success';

export interface Turn {
  id: string;
  role: 'ai' | 'candidate';
  content: string;
  timestamp: string;
  questionId?: string;
  evaluation?: AnswerEvaluation;
  /** When the AI asks a coding question, show code editor with this starter code */
  codingStarterCode?: string | null;
  codingLanguage?: string | null;
  isCodingQuestion?: boolean;
}

export interface AnswerEvaluation {
  score: number;
  maxScore: number;
  relevance: number;
  structure: number;
  depth: number;
  competencyIds: string[];
  redFlags: string[];
  feedbackSnippet: string;
  normalizedScore: number;
}

export interface InterviewState {
  interviewId: string;
  candidateId: string;
  /** Parsed candidate resume/profile summary to personalize interview questions */
  resumeContext?: string;
  role: InterviewRole;
  phase: InterviewPhase;
  startedAt: string;
  endedAt?: string;
  turns: Turn[];
  topicCoverage: Record<string, boolean>;
  currentDifficulty: string;
  /** Recruiter-set focus areas / subject (e.g. backend, APIs) */
  focusAreas?: string;
  /** Recruiter-set duration in minutes */
  durationMinutes?: number;
  approximateTokens: number;
}

export interface ReportCompetency {
  competencyId: string;
  name: string;
  score: number;
  maxScore: number;
  evidence: string[];
}

export type Recommendation = 'strong_hire' | 'hire' | 'no_hire' | 'borderline';

export interface InterviewReport {
  interviewId: string;
  candidateId: string;
  role: InterviewRole;
  startedAt: string;
  endedAt: string;
  overallScore: number;
  maxScore: number;
  recommendation: Recommendation;
  summary: string;
  competencies: ReportCompetency[];
  redFlags: string[];
  strengths: string[];
  improvements: string[];
  questionAnswerSummary: { question: string; answer: string; score: number }[];
}

export interface StartInterviewResponse {
  interviewId: string;
  state: InterviewState;
  firstReply: string;
}

export interface SubmitAnswerResponse {
  state: InterviewState | null;
  nextReply?: string;
  evaluation?: { score: number; maxScore: number };
  report?: InterviewReport;
}
