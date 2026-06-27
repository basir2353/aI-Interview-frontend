export type CodingInterviewModeId =
  | 'dsa'
  | 'frontend'
  | 'backend'
  | 'fullstack'
  | 'system_design'
  | 'database_sql'
  | 'devops_cloud'
  | 'ai_ml'
  | 'debugging'
  | 'code_review';

export const CODING_INTERVIEW_MODES: Array<{ id: CodingInterviewModeId; label: string }> = [
  { id: 'dsa', label: 'DSA / Algorithms' },
  { id: 'frontend', label: 'Frontend Development' },
  { id: 'backend', label: 'Backend Development' },
  { id: 'fullstack', label: 'Full Stack Development' },
  { id: 'system_design', label: 'System Design' },
  { id: 'database_sql', label: 'Database & SQL' },
  { id: 'devops_cloud', label: 'DevOps / Cloud' },
  { id: 'ai_ml', label: 'AI / Machine Learning' },
  { id: 'debugging', label: 'Debugging Challenges' },
  { id: 'code_review', label: 'Live Code Review' },
];

export function formatFocusAreasWithCodingMode(
  modeId: CodingInterviewModeId | '',
  userFocus?: string
): string | undefined {
  const parts: string[] = [];
  if (modeId) parts.push(`coding_mode:${modeId}`);
  if (userFocus?.trim()) parts.push(userFocus.trim());
  return parts.length ? parts.join(' | ') : undefined;
}
