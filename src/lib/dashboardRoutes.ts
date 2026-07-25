const PUBLIC_RECRUITER_ROUTES = new Set(['/recruiter/login', '/recruiter/forgot-password']);
const PUBLIC_CANDIDATE_AUTH = new Set([
  '/candidate/login',
  '/candidate/signup',
  '/candidate/forgot-password',
]);

export function normalizePathname(pathname: string | null | undefined): string {
  if (!pathname) return '';
  return pathname.replace(/\/$/, '') || '/';
}

export function isRecruiterAppRoute(pathname: string | null | undefined): boolean {
  const path = normalizePathname(pathname);
  if (!path.startsWith('/recruiter')) return false;
  return !PUBLIC_RECRUITER_ROUTES.has(path);
}

export function isAdminAppRoute(pathname: string | null | undefined): boolean {
  const path = normalizePathname(pathname);
  return path.startsWith('/admin') && path !== '/admin/login';
}

/** Logged-in candidate workspace (not auth pages). */
export function isCandidateAppRoute(pathname: string | null | undefined): boolean {
  const path = normalizePathname(pathname);
  if (!path.startsWith('/candidate')) return false;
  return !PUBLIC_CANDIDATE_AUTH.has(path);
}

export function shouldHideSiteHeader(pathname: string | null | undefined): boolean {
  const path = normalizePathname(pathname);
  if (isRecruiterAppRoute(path) || isAdminAppRoute(path) || isCandidateAppRoute(path)) return true;
  // Auth + immersive interview paths — CandidateAuthLayout / join UI own the chrome
  if (PUBLIC_CANDIDATE_AUTH.has(path)) return true;
  if (path.startsWith('/interview/join') || path.startsWith('/interview/enter')) return true;
  return false;
}
