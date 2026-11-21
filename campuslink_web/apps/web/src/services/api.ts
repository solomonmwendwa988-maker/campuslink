
const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:4000')
  .replace(/\/+$/, '');

const API_PREFIX = `${API_ORIGIN}/api/v1`;

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export interface ApiUser {
  id: string;
  email: string;
  username: string;
  name: string;
  campus?: string;
  course?: string;
  year?: number;
  bio?: string;
  interests?: string[];
  skills?: string[];
  emailVerified?: boolean;
}

export interface AuthResponse {
  user: ApiUser;
  accessToken: string;
  reactivated?: boolean;
}

export interface RegisterPayload {
  email: string;
  username: string;
  name: string;
  password: string;
  campus: string;
  course: string;
  year: number;
  bio?: string;
  interests?: string[];
  skills?: string[];
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends RequestInit {
  authenticated?: boolean;
  retry?: boolean;
}

function extractMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;

  const payload = data as { message?: string | string[]; error?: string };

  if (Array.isArray(payload.message)) {
    return payload.message.join(', ');
  }

  return payload.message || payload.error || fallback;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    authenticated = false,
    retry = true,
    ...fetchOptions
  } = options;

  const headers = new Headers(fetchOptions.headers);
  headers.set('Accept', 'application/json');

  if (fetchOptions.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (authenticated && accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_PREFIX}${path}`, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && authenticated && retry) {
    const newToken = await refreshAccessToken();

    if (newToken) {
      return request<T>(path, {
        ...options,
        retry: false,
      });
    }
  }

  const contentType = response.headers.get('content-type') || '';

  const data = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok) {
    throw new ApiError(
      extractMessage(data, `Request failed (${response.status})`),
      response.status,
      data,
    );
  }

  return data as T;
}

/* =========================================================
   AUTHENTICATION
   ========================================================= */

export async function register(
  payload: RegisterPayload,
): Promise<ApiUser> {
  return request<ApiUser>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function login(
  payload: LoginPayload,
): Promise<AuthResponse> {
  const result = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  accessToken = result.accessToken;

  return result;
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const result = await request<{ accessToken: string }>('/auth/refresh', {
        method: 'POST',
        retry: false,
      });

      accessToken = result.accessToken;

      return result.accessToken;
    } catch {
      accessToken = null;
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function getMe(): Promise<ApiUser> {
  return request<ApiUser>('/auth/me', {
    authenticated: true,
  });
}

export async function logout(): Promise<void> {
  try {
    await request('/auth/logout', {
      method: 'POST',
      authenticated: true,
      retry: false,
    });
  } finally {
    accessToken = null;
  }
}

export function clearAccessToken(): void {
  accessToken = null;
}

/* =========================================================
   PASSWORD
   ========================================================= */

export async function forgotPassword(email: string) {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}) {
  return request('/auth/change-password', {
    method: 'POST',
    authenticated: true,
    body: JSON.stringify(payload),
  });
}

/* =========================================================
   ACCOUNT
   ========================================================= */

export async function deactivateAccount() {
  return request('/auth/deactivate', {
    method: 'POST',
    authenticated: true,
  });
}

export async function deleteAccount() {
  return request('/auth/account', {
    method: 'DELETE',
    authenticated: true,
  });
}

/* =========================================================
   SESSIONS
   ========================================================= */

export async function getSessions() {
  return request('/auth/sessions', {
    authenticated: true,
  });
}

export async function revokeSession(sessionId: string) {
  return request(`/auth/sessions/${encodeURIComponent(sessionId)}/revoke`, {
    method: 'POST',
    authenticated: true,
  });
}

/* =========================================================
   REAL MESSAGING (database-backed)
   ========================================================= */

export interface MessagingPerson {
  id: string;
  username: string;
  profile?: { fullName?: string | null; photoUrl?: string | null } | null;
}

export interface ApiMessage {
  id: string;
  conversationId: string;
  senderId: string;
  clientMessageId?: string | null;
  content: string;
  readAt?: string | null;
  createdAt: string;
  sender?: MessagingPerson;
  attachments?: Array<{ id: string; url: string; mediaType: string }>;
  reactions?: Array<{ userId: string; reaction: string }>;
}

export interface ApiConversation {
  id: string;
  participants: MessagingPerson[];
  lastMessage: ApiMessage | null;
  unreadCount: number;
  updatedAt: string;
}

export async function listConversations() {
  return request<{ data: ApiConversation[] }>('/messages/conversations', { authenticated: true });
}
export async function startConversation(username: string) {
  return request<{ conversation: ApiConversation }>('/messages/conversations', {
    method: 'POST', authenticated: true, body: JSON.stringify({ username }),
  });
}
export async function getConversationMessages(conversationId: string, cursor?: string) {
  const suffix = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return request<{ data: ApiMessage[]; nextCursor: string | null }>(`/messages/conversations/${encodeURIComponent(conversationId)}/messages${suffix}`, { authenticated: true });
}
export async function sendConversationMessage(conversationId: string, content: string, clientMessageId: string) {
  return request<{ message: ApiMessage; duplicate?: boolean }>(`/messages/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: 'POST', authenticated: true, body: JSON.stringify({ content, clientMessageId }),
  });
}
export async function markConversationRead(conversationId: string) {
  return request<{ readAt: string }>(`/messages/conversations/${encodeURIComponent(conversationId)}/read`, { method: 'POST', authenticated: true });
}
