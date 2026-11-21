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

export function pageFromPath(path: string): string {
  return pages[path] ?? 'Landing';
}
