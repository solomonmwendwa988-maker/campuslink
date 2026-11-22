const routes: Record<string, string> = {
  Landing: '/',
  Home: '/home',
  Explore: '/explore',
  Marketplace: '/marketplace',
  Messages: '/messages',
  Events: '/events',
  Notifications: '/notifications',
  Saved: '/saved',
  Profile: '/profile',
  Settings: '/settings',
  Login: '/login',
  Register: '/register',
  'Forgot password': '/forgot-password',
  'Reset password': '/reset-password',
  'Verify email': '/verify-email',
};

const pages = Object.fromEntries(Object.entries(routes).map(([page, path]) => [path, page]));

export function pathForPage(page: string): string {
  return routes[page] ?? '/home';
}

export function pathForProfile(username: string): string {
  const normalized = username.trim().replace(/^@/, '');
  return normalized ? `/profile/${encodeURIComponent(normalized)}` : '/profile';
}

export function usernameFromPath(path: string): string | null {
  const match = path.match(/^\/profile\/([^/]+)\/?$/i);
  if (!match) return null;
  try { return decodeURIComponent(match[1]).replace(/^@/, '') || null; }
  catch { return null; }
}

export function pageFromPath(path: string): string {
  if (usernameFromPath(path)) return 'Profile';
  return pages[path.replace(/\/$/, '') || '/'] ?? 'Landing';
}
