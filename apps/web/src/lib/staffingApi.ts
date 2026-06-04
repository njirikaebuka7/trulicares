/**
 * Staffing Module API Client
 * Independent from the family/caregiver api.ts
 * All endpoints are under /api/staffing/*
 */
import { get, post, put, del } from './api';

// ── Professional ───────────────────────────────────────────────
export const professional = {
  me: () => get('/staffing/professionals/me'),
  register: (data: any) => post('/staffing/professionals/register', data),
  updateProfile: (data: any) => put('/staffing/professionals/profile', data),
  getById: (id: string) => get(`/staffing/professionals/${id}`),
  submitGovtId: (data: { idFrontUrl?: string; idBackUrl?: string; selfieUrl?: string; idNumber?: string }) =>
    post('/staffing/professionals/govt-id', data),
  submitBackgroundCheck: (details: any) =>
    post('/staffing/professionals/background-check', { details }),
};

// ── Facility ───────────────────────────────────────────────────
export const facility = {
  me: () => get('/staffing/facilities/me'),
  register: (data: any) => post('/staffing/facilities/register', data),
  updateProfile: (data: any) => put('/staffing/facilities/profile', data),
  getById: (id: string) => get(`/staffing/facilities/${id}`),
};

// ── Shifts ─────────────────────────────────────────────────────
export const shifts = {
  browse: (params?: {
    role?: string;
    city?: string;
    state?: string;
    minPay?: number;
    maxPay?: number;
    startAfter?: string;
    limit?: number;
    offset?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.role) q.set('role', params.role);
    if (params?.city) q.set('city', params.city);
    if (params?.state) q.set('state', params.state);
    if (params?.minPay) q.set('minPay', String(params.minPay));
    if (params?.maxPay) q.set('maxPay', String(params.maxPay));
    if (params?.startAfter) q.set('startAfter', params.startAfter);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));
    return get(`/staffing/shifts?${q.toString()}`);
  },
  my: () => get('/staffing/shifts/my'),
  getActive: () => get('/staffing/shifts/active'),
  getOverview: () => get('/staffing/shifts/overview'),
  getFacilityOverview: () => get('/staffing/shifts/overview'),
  get: (id: string) => get(`/staffing/shifts/${id}`),
  post: (data: any) => post('/staffing/shifts', data),
  update: (id: string, data: any) => put(`/staffing/shifts/${id}`, data),
  cancel: (id: string) => del(`/staffing/shifts/${id}`),
};

// ── Applications ───────────────────────────────────────────────
export const applications = {
  apply: (shiftId: string, coverNote?: string) =>
    post('/staffing/applications', { shiftId, coverNote }),
  my: () => get('/staffing/applications/my'),
  forShift: (shiftId: string) => get(`/staffing/applications/shift/${shiftId}`),
  accept: (id: string) => put(`/staffing/applications/${id}/accept`),
  reject: (id: string) => put(`/staffing/applications/${id}/reject`),
  withdraw: (id: string) => put(`/staffing/applications/${id}/withdraw`),
};

// ── Bookings + Check-in/out ────────────────────────────────────
export const bookings = {
  list: () => get('/staffing/checkin/bookings'),
  get: (id: string) => get(`/staffing/checkin/bookings/${id}`),
  checkIn: (bookingId: string, coords?: { lat?: number; lng?: number }) =>
    post(`/staffing/checkin/${bookingId}`, coords || {}),
  confirmStart: (bookingId: string) => post(`/staffing/checkin/confirm-start/${bookingId}`),
  checkOut: (bookingId: string, coords?: { lat?: number; lng?: number }) =>
    post(`/staffing/checkin/checkout/${bookingId}`, coords || {}),
  confirmComplete: (bookingId: string, note?: string) =>
    post(`/staffing/checkin/confirm-complete/${bookingId}`, { note }),
  cancel: (bookingId: string, reason?: string) =>
    post(`/staffing/checkin/cancel/${bookingId}`, { reason }),
  noShow: (bookingId: string, reason?: string) =>
    post(`/staffing/checkin/no-show/${bookingId}`, { reason }),
};

// ── Ratings (two-way) ──────────────────────────────────────────
export const ratings = {
  submit: (bookingId: string, rating: number, comment?: string) =>
    post('/staffing/ratings', { bookingId, rating, comment }),
  forBooking: (bookingId: string) => get(`/staffing/ratings/booking/${bookingId}`),
};

// ── Wallet ─────────────────────────────────────────────────────
export const wallet = {
  get: () => get('/staffing/wallet'),
  withdraw: (amount: number) => post('/staffing/wallet/withdraw', { amount }),
  saveBankAccount: (data: {
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
    routingNumber: string;
    accountType: 'checking' | 'savings';
  }) => post('/staffing/wallet/bank-account', data),
  getBankAccount: () => get('/staffing/wallet/bank-account'),
  // Stripe Connect (Express) payouts — bank details are now collected by Stripe onboarding.
  connectStatus: () => get('/staffing/wallet/connect/status'),
  connectOnboard: () => post('/staffing/wallet/connect/onboard'),
};

// ── Disputes ───────────────────────────────────────────────────
export const disputes = {
  raise: (bookingId: string, reason: string, description?: string) =>
    post('/staffing/disputes', { bookingId, reason, description }),
  my: () => get('/staffing/disputes/my'),
  all: (status?: string) => get(`/staffing/disputes${status ? `?status=${status}` : ''}`),
  resolve: (id: string, status: 'resolved' | 'dismissed', resolutionNotes?: string) =>
    put(`/staffing/disputes/${id}`, { status, resolutionNotes }),
};
