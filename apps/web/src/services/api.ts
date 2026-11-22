
const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:4000')
  .replace(/\/+$/, '');

const API_PREFIX = `${API_ORIGIN}/api/v1`;

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export interface ApiUser {
  id: string;
  email?: string;
  username: string;
  name?: string;
  campus?: string;
  course?: string;
  year?: number;
  bio?: string;
  interests?: string[];
  skills?: string[];
  emailVerified?: boolean;
  profile?: { fullName?: string | null; bio?: string | null; course?: string | null; yearOfStudy?: number | string | null; photoUrl?: string | null; coverUrl?: string | null; interests?: string[]; skills?: string[]; isPrivate?: boolean; verifiedAt?: string | null; campus?: { name?: string | null } | string | null; university?: { name?: string | null } | string | null } | null;
  counts?: { follows?: number; followedBy?: number; posts?: number };
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
  photoUrl?: string;
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

  if (fetchOptions.body && !headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
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
  const result = await request<{ user: ApiUser }>('/auth/me', { authenticated: true });
  return result.user;
}

export async function getOwnProfile(): Promise<{ user: PublicStudentProfile }> {
  return request<{ user: PublicStudentProfile }>('/profiles/me', { authenticated: true });
}

export type UpdateOwnProfilePayload = { email?: string; username?: string; fullName?: string; bio?: string | null; course?: string; campus?: string; yearOfStudy?: number; interests?: string[]; skills?: string[]; isPrivate?: boolean; photoUrl?: string | null; coverUrl?: string | null };

export async function updateOwnProfile(payload: UpdateOwnProfilePayload) {
  return request('/profiles/me', { method: 'PATCH', authenticated: true, body: JSON.stringify(payload) });
}

export type AdminIdentity = { admin: { id: string; username: string; role: 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN' }; permissions: string[] };
export async function getAdminIdentity() {
  return request<AdminIdentity>('/admin/auth/me', { authenticated: true });
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
  deliveredAt?: string | null;
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
  muted?: boolean;
  updatedAt: string;
}

export async function listConversations(signal?: AbortSignal) {
  return request<{ data: ApiConversation[] }>('/messages/conversations', { authenticated: true, signal });
}
export async function startConversation(username: string) {
  return request<{ conversation: ApiConversation }>('/messages/conversations', {
    method: 'POST', authenticated: true, body: JSON.stringify({ username }),
  });
}
export async function getConversationMessages(conversationId: string, cursor?: string, signal?: AbortSignal) {
  const suffix = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return request<{ data: ApiMessage[]; nextCursor: string | null }>(`/messages/conversations/${encodeURIComponent(conversationId)}/messages${suffix}`, { authenticated: true, signal });
}
export async function sendConversationMessage(conversationId: string, content: string, clientMessageId: string) {
  return request<{ message: ApiMessage; duplicate?: boolean }>(`/messages/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: 'POST', authenticated: true, body: JSON.stringify({ content, clientMessageId }),
  });
}
export async function markConversationRead(conversationId: string) {
  return request<{ readAt: string }>(`/messages/conversations/${encodeURIComponent(conversationId)}/read`, { method: 'POST', authenticated: true });
}
export async function muteConversation(conversationId: string) { return request<{ muted: boolean }>(`/messages/conversations/${encodeURIComponent(conversationId)}/mute`, { method: 'POST', authenticated: true }); }
export async function unmuteConversation(conversationId: string) { return request<{ muted: boolean }>(`/messages/conversations/${encodeURIComponent(conversationId)}/mute`, { method: 'DELETE', authenticated: true }); }

export async function sendVoiceMessage(conversationId: string, audio: Blob, clientMessageId: string) {
  const contentType = audio.type.split(';')[0] || 'audio/webm';
  return request<{ message: ApiMessage; duplicate?: boolean }>(`/messages/conversations/${encodeURIComponent(conversationId)}/voice?clientMessageId=${encodeURIComponent(clientMessageId)}`, { method: 'POST', authenticated: true, headers: { 'Content-Type': contentType }, body: audio });
}

export async function blockUser(userId: string) {
  return request<{ blocked: boolean }>('/safety/block', { method: 'POST', authenticated: true, body: JSON.stringify({ userId }) });
}

export interface SafetyAccount { id: string; username: string; profile?: { fullName?: string | null; photoUrl?: string | null } | null; blockedAt?: string; mutedAt?: string; }
export async function getBlockedUsers() { return request<{ data: SafetyAccount[] }>('/safety/blocked', { authenticated: true }); }
export async function unblockUser(userId: string) { return request<{ blocked: boolean }>(`/safety/block/${encodeURIComponent(userId)}`, { method: 'DELETE', authenticated: true }); }
export async function getMutedUsers() { return request<{ data: SafetyAccount[] }>('/safety/muted', { authenticated: true }); }
export async function muteAccount(userId: string) { return request<{ muted: boolean }>('/safety/mute', { method: 'POST', authenticated: true, body: JSON.stringify({ userId }) }); }
export async function unmuteAccount(userId: string) { return request<{ muted: boolean }>(`/safety/mute/${encodeURIComponent(userId)}`, { method: 'DELETE', authenticated: true }); }
export async function reportUser(userId: string, reason: 'SPAM'|'HARASSMENT'|'INAPPROPRIATE'|'FRAUD'|'OTHER', details?: string) {
  return request<{ report: { id: string; targetType: string; status: string } }>('/safety/reports', { method: 'POST', authenticated: true, body: JSON.stringify({ targetType: 'USER', targetId: userId, reason, details }) });
}

export interface DiscoverStudent {
  id: string;
  username: string;
  profile?: {
    fullName?: string | null;
    course?: string | null;
    yearOfStudy?: number | null;
    bio?: string | null;
    photoUrl?: string | null;
    university?: { name?: string | null } | null;
    campus?: { name?: string | null } | null;
    interests?: string[];
    skills?: string[];
  } | null;
  counts?: { follows?: number; followedBy?: number; posts?: number };
}

export async function discoverStudents(search = ''): Promise<DiscoverStudent[]> {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  const result = await request<{ data: DiscoverStudent[] }>(`/profiles/discover${query}`, { authenticated: true });
  return result.data ?? [];
}


export interface ApiNotification {
  id: string;
  type: 'LIKE' | 'COMMENT' | 'REPLY' | 'REPOST' | 'FOLLOW' | 'MESSAGE' | 'EVENT';
  entityId?: string | null;
  postId?: string | null;
  commentId?: string | null;
  parentCommentId?: string | null;
  readAt?: string | null;
  createdAt: string;
  actor?: { id: string; username: string; profile?: { fullName?: string | null; photoUrl?: string | null } | null } | null;
}

export async function listNotifications(cursor?: string) {
  const suffix = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return request<{ data: ApiNotification[]; nextCursor: string | null }>(`/notifications${suffix}`, { authenticated: true });
}
export async function markNotificationRead(id: string) {
  return request<{ read: boolean }>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH', authenticated: true });
}
export async function markAllNotificationsRead() {
  return request<{ markedRead: number }>('/notifications/read-all', { method: 'PATCH', authenticated: true });
}

/* =========================================================
   MESSAGING PRESENCE & TYPING
   ========================================================= */
export type PresenceStatus = { userId: string; online: boolean; lastSeenAt: string | null };
export async function heartbeatPresence() {
  return request<{ online: true }>('/messages/conversations/presence/heartbeat', { method: 'POST', authenticated: true });
}
export async function getPresence(userIds: string[]) {
  const uniqueIds = [...new Set(userIds)].slice(0, 50);
  if (!uniqueIds.length) return { data: [] as PresenceStatus[] };
  return request<{ data: PresenceStatus[] }>(`/messages/conversations/presence?userIds=${encodeURIComponent(uniqueIds.join(','))}`, { authenticated: true });
}
export async function setConversationTyping(conversationId: string, typing: boolean) {
  return request<{ ok: true }>(`/messages/conversations/${encodeURIComponent(conversationId)}/typing`, { method: 'POST', authenticated: true, body: JSON.stringify({ typing }) });
}
export async function getConversationTyping(conversationId: string) {
  return request<{ userIds: string[] }>(`/messages/conversations/${encodeURIComponent(conversationId)}/typing`, { authenticated: true });
}

/* =========================================================
   STUDENT PROFILES & CONNECTIONS
   ========================================================= */

export interface PublicStudentProfile extends DiscoverStudent {
  email?: string;
  isFollowing?: boolean;
  profile?: DiscoverStudent['profile'] & {
    verifiedAt?: string | null;
    coverUrl?: string | null;
    campus?: { name?: string | null } | string | null;
    university?: { name?: string | null } | string | null;
  };
}

export type VerificationRequestPayload = { fullName: string; studentId: string; phone: string; course: string; campus: string; reason: string; attestationsAccepted: boolean };
export async function submitVerificationRequest(payload: VerificationRequestPayload) {
  return request<{ request: { id: string; status: string; submittedAt: string }; message: string }>('/profiles/verification-requests', { method: 'POST', authenticated: true, body: JSON.stringify(payload) });
}
export async function getMyVerificationRequest() {
  return request<{ request: { id: string; status: string; submittedAt: string; reviewedAt?: string | null; reviewNote?: string | null } | null }>('/profiles/verification-requests/me', { authenticated: true });
}

export async function getPublicProfile(username: string): Promise<{ user: PublicStudentProfile }> {
  return request<{ user: PublicStudentProfile }>(`/profiles/${encodeURIComponent(username.replace(/^@/, ''))}`, {
    authenticated: true,
  });
}

export async function followStudent(username: string): Promise<{ following: boolean }> {
  return request<{ following: boolean }>(`/profiles/${encodeURIComponent(username.replace(/^@/, ''))}/follow`, {
    method: 'POST',
    authenticated: true,
  });
}

export async function unfollowStudent(username: string): Promise<{ following: boolean }> {
  return request<{ following: boolean }>(`/profiles/${encodeURIComponent(username.replace(/^@/, ''))}/unfollow`, {
    method: 'POST',
    authenticated: true,
  });
}

export async function getProfileFollowers(username: string, cursor?: string) {
  const suffix = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return request<{ data: MessagingPerson[]; nextCursor: string | null }>(
    `/profiles/${encodeURIComponent(username.replace(/^@/, ''))}/followers${suffix}`,
    { authenticated: true },
  );
}

export async function getProfileFollowing(username: string, cursor?: string) {
  const suffix = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return request<{ data: MessagingPerson[]; nextCursor: string | null }>(
    `/profiles/${encodeURIComponent(username.replace(/^@/, ''))}/following${suffix}`,
    { authenticated: true },
  );
}

export interface SocialPostApiRecord {
  id: string; content: string; createdAt: string; updatedAt?: string; authorId: string;
  author?: MessagingPerson; _count?: { likes: number; comments: number; reposts: number; views?: number };
  liked?: boolean; bookmarked?: boolean; reposted?: boolean; viewed?: boolean; media?: Array<{ id: string; url: string; position: number }>;
}
export type SocialPage = { data: SocialPostApiRecord[]; nextCursor: string | null };
export async function createSocialPost(content: string) { return request<SocialPostApiRecord>('/posts', { method: 'POST', authenticated: true, body: JSON.stringify({ content }) }); }
export async function editSocialPost(postId: string, content: string) { return request<SocialPostApiRecord>(`/posts/${encodeURIComponent(postId)}`, { method: 'PATCH', authenticated: true, body: JSON.stringify({ content }) }); }
export async function deleteSocialPost(postId: string) { return request<{ message: string }>(`/posts/${encodeURIComponent(postId)}`, { method: 'DELETE', authenticated: true }); }
export async function getSocialFeed(options: { cursor?: string; mode?: 'latest' | 'popular'; following?: boolean } = {}) {
  const query = new URLSearchParams(); if (options.cursor) query.set('cursor', options.cursor); if (options.mode && !options.following) query.set('mode', options.mode);
  const path = options.following ? '/posts/following' : '/posts';
  return request<SocialPage>(`${path}${query.size ? `?${query.toString()}` : ''}`, { authenticated: true });
}
export async function getSavedSocialPosts(cursor?: string) {
  const suffix = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return request<SocialPage>(`/posts/saved${suffix}`, { authenticated: true });
}
export async function getTrendingSocialPosts() {
  return request<{ data: SocialPostApiRecord[] }>('/posts/trending', { authenticated: true });
}
export async function getRecommendedStudents() {
  return request<{ data: Array<{ user: DiscoverStudent; sharedInterests: number }> }>('/profiles/recommended', { authenticated: true });
}
export async function likeSocialPost(postId: string) { return request<{ liked: boolean }>(`/posts/${encodeURIComponent(postId)}/like`, { method: 'POST', authenticated: true }); }
export async function unlikeSocialPost(postId: string) { return request<{ liked: boolean }>(`/posts/${encodeURIComponent(postId)}/like`, { method: 'DELETE', authenticated: true }); }
export async function bookmarkSocialPost(postId: string) { return request<{ bookmarked: boolean }>(`/posts/${encodeURIComponent(postId)}/bookmark`, { method: 'POST', authenticated: true }); }
export async function unbookmarkSocialPost(postId: string) { return request<{ bookmarked: boolean }>(`/posts/${encodeURIComponent(postId)}/bookmark`, { method: 'DELETE', authenticated: true }); }
export async function repostSocialPost(postId: string) { return request<{ reposted: boolean }>(`/posts/${encodeURIComponent(postId)}/repost`, { method: 'POST', authenticated: true }); }
export async function unrepostSocialPost(postId: string) { return request<{ reposted: boolean }>(`/posts/${encodeURIComponent(postId)}/repost`, { method: 'DELETE', authenticated: true }); }
export async function createSocialComment(postId: string, content: string, parentId?: string) { return request(`/posts/${encodeURIComponent(postId)}/comments`, { method: 'POST', authenticated: true, body: JSON.stringify({ content, ...(parentId ? { parentId } : {}) }) }); }
export async function getSocialComments(postId: string, cursor?: string) { const suffix = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''; return request<{ data: unknown[]; nextCursor: string | null }>(`/posts/${encodeURIComponent(postId)}/comments${suffix}`, { authenticated: true }); }
export async function getSocialPost(postId: string) { return request<SocialPostApiRecord>(`/posts/${encodeURIComponent(postId)}`, { authenticated: true }); }
export async function likeSocialComment(commentId: string) { return request<{ liked: boolean; likesCount: number }>(`/posts/comments/${encodeURIComponent(commentId)}/like`, { method: 'POST', authenticated: true }); }
export async function unlikeSocialComment(commentId: string) { return request<{ liked: boolean; likesCount: number }>(`/posts/comments/${encodeURIComponent(commentId)}/like`, { method: 'DELETE', authenticated: true }); }
export async function getProfileConnections(username: string, direction: 'followers'|'following') { return request<{ data: Array<{ id: string; username: string; profile?: { fullName?: string | null; photoUrl?: string | null } | null }> }>(`/profiles/${encodeURIComponent(username)}/${direction}`, { authenticated: true }); }
export async function getActivitySummary() { return request<{ unreadNotifications: number; engagement: { posts: number; likesReceived: number; commentsReceived: number; repostsReceived: number; totalReceived: number } }>('/notifications/summary', { authenticated: true }); }

/* =========================================================
   CAMPUS MARKETPLACE (database-backed)
   ========================================================= */
export interface MarketplaceApiListing {
  id: string; title: string; description: string; category: string; price: string | number;
  condition: 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR'; available: boolean;
  sellerId: string; seller?: MessagingPerson; images?: Array<{ id: string; url: string; position: number }>;
  campus?: { id: string; name: string; university?: { name?: string } };
  _count?: { favorites?: number };
}
export async function getMarketplaceListings(params: { search?: string; category?: string; minPrice?: number; maxPrice?: number; cursor?: string } = {}) {
  const query = new URLSearchParams();
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.category?.trim()) query.set('category', params.category.trim());
  if (params.minPrice !== undefined) query.set('minPrice', String(params.minPrice));
  if (params.maxPrice !== undefined) query.set('maxPrice', String(params.maxPrice));
  if (params.cursor) query.set('cursor', params.cursor);
  const suffix = query.size ? `?${query.toString()}` : '';
  return request<{ data: MarketplaceApiListing[]; nextCursor: string | null }>(`/marketplace/listings${suffix}`, { authenticated: true });
}
export async function createMarketplaceListing(payload: { title: string; description: string; category: string; price: number; condition: MarketplaceApiListing['condition']; images?: string[] }) {
  return request<MarketplaceApiListing>('/marketplace/listings', { method: 'POST', authenticated: true, body: JSON.stringify(payload) });
}
export async function favoriteMarketplaceListing(id: string) {
  return request<{ favorited: boolean }>(`/marketplace/listings/${encodeURIComponent(id)}/favorite`, { method: 'POST', authenticated: true });
}
export async function unfavoriteMarketplaceListing(id: string) {
  return request<{ favorited: boolean }>(`/marketplace/listings/${encodeURIComponent(id)}/favorite`, { method: 'DELETE', authenticated: true });
}
export async function recordPostView(postId: string) {
  return request<{ viewed: boolean; views: number }>(`/posts/${encodeURIComponent(postId)}/view`, { method: 'POST', authenticated: true });
}
