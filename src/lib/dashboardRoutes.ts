const PUBLIC_RECRUITER_ROUTES = new Set(['/recruiter/login', '/recruiter/forgot-password']);

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

export function shouldHideSiteHeader(pathname: string | null | undefined): boolean {
  return isRecruiterAppRoute(pathname) || isAdminAppRoute(pathname);
}
