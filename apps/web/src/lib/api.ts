const BASE = '/api';

export function getToken(): string | null {
  return localStorage.getItem('tc_token');
}

export function setToken(token: string) {
  localStorage.setItem('tc_token', token);
}

export function clearToken() {
  localStorage.removeItem('tc_token');
}

function headers(extra?: Record<string, string>): Record<string, string> {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function handleResponse(res: Response) {
  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      msg = body.error || body.message || msg;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function get(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: headers() });
  return handleResponse(res);
}

export async function post(path: string, body?: any) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse(res);
}

export async function put(path: string, body?: any) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse(res);
}

export async function del(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'DELETE',
    headers: headers(),
  });
  return handleResponse(res);
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  login: (email: string, password: string) => post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string, role: string) =>
    post('/auth/register', { name, email, password, role }),
  me: () => get('/auth/me'),
  settings: () => get('/auth/settings'),
  stats: () => get('/auth/stats'),
  updateProfile: (data: any) => put('/auth/profile', data),
  uploadPhoto: (photoData: string) => post('/auth/profile-photo', { photoData }),
  changePassword: (currentPassword: string, newPassword: string) =>
    put('/auth/password', { currentPassword, newPassword }),
  deleteAccount: () => del('/auth/account'),
  updateNotifications: (prefs: Record<string, boolean>) => put('/auth/notifications', prefs),
  updatePrivacy: (prefs: Record<string, boolean>) => put('/auth/privacy', prefs),
  forgotPassword: (email: string) => post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => post('/auth/reset-password', { token, password }),
};

// ── Clients ───────────────────────────────────────────────────────────────────
export const clients = {
  list: () => get('/clients'),
};

// ── Caregivers ────────────────────────────────────────────────────────────────
export const caregivers = {
  list: (params?: { category?: string; verified?: boolean; backgroundChecked?: boolean; sort?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set('category', params.category);
    if (params?.verified) q.set('verified', 'true');
    if (params?.backgroundChecked) q.set('backgroundChecked', 'true');
    if (params?.sort) q.set('sort', params.sort);
    if (params?.search) q.set('search', params.search);
    return get(`/caregivers?${q.toString()}`);
  },
  get: (id: string) => get(`/caregivers/${id}`),
  getProfile: () => get('/caregivers/profile/me'),
  updateProfile: (data: any) => put('/caregivers/profile', data),
};

// ── Care Requests ─────────────────────────────────────────────────────────────
export const requests = {
  create: (data: any) => post('/care-requests', data),
  list: () => get('/care-requests'),
  get: (id: string) => get(`/care-requests/${id}`),
};

// ── Matches ───────────────────────────────────────────────────────────────────
export const matches = {
  list: () => get('/matches'),
  request: (id: string) => post(`/matches/${id}/request`),
  accept: (id: string) => put(`/matches/${id}/accept`),
  decline: (id: string) => put(`/matches/${id}/decline`),
  unlockMessaging: (id: string) => post(`/matches/${id}/unlock-messaging`),
};

// ── Messages ──────────────────────────────────────────────────────────────────
export const messages = {
  conversations: () => get('/conversations'),
  getMessages: (conversationId: string) => get(`/conversations/${conversationId}/messages`),
  send: (conversationId: string, content: string) =>
    post(`/conversations/${conversationId}/messages`, { content }),
  startConversation: (otherUserId: string) => post('/conversations', { otherUserId }),
};

// ── Schedule ──────────────────────────────────────────────────────────────────
export const schedule = {
  list: () => get('/schedule'),
};

// ── Reviews ───────────────────────────────────────────────────────────────────
export const reviews = {
  list: () => get('/reviews'),
  create: (caregiverId: string, rating: number, text: string, service: string) =>
    post('/reviews', { caregiverId, rating, text, service }),
};

// ── Earnings ──────────────────────────────────────────────────────────────────
export const earnings = {
  get: () => get('/earnings'),
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const payments = {
  list: () => get('/payments'),
  createIntent: (matchId: string) => post('/payments/intent', { matchId }),
  createCheckout: (priceId: string) => post('/payments/checkout', { priceId }),
  paymentMethods: () => get('/payments/payment-methods'),
  config: () => get('/payments/config'),
  setupIntent: () => post('/payments/setup-intent', {}),
  addPaymentMethod: (paymentMethodId: string) =>
    post('/payments/payment-method', { paymentMethodId }),
  removePaymentMethod: (id: string) => del(`/payments/payment-method/${id}`),
  setDefaultPaymentMethod: (id: string) => put(`/payments/payment-method/${id}/default`),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notifications = {
  list: () => get('/notifications'),
  markRead: (id: string) => put(`/notifications/${id}/read`),
  markAllRead: () => put('/notifications/read-all'),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const admin = {
  stats: () => get('/admin/stats'),
  users: (params?: { search?: string; role?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.role) q.set('role', params.role);
    if (params?.page) q.set('page', String(params.page));
    return get(`/admin/users?${q.toString()}`);
  },
  updateUser: (id: string, data: any) => put(`/admin/users/${id}`, data),
  deleteUser: (id: string) => del(`/admin/users/${id}`),
  suspendUser: (id: string) => put(`/admin/users/${id}/suspend`),
  restoreUser: (id: string) => put(`/admin/users/${id}/restore`),
  verificationQueue: () => get('/admin/verification-queue'),
  updateVerification: (id: string, status: 'approved' | 'rejected') =>
    put(`/admin/verification/${id}`, { status }),
  reports: () => get('/admin/reports'),
  updateReport: (id: string, status: 'resolved' | 'dismissed' | 'under_review') =>
    put(`/admin/reports/${id}`, { status }),
};
