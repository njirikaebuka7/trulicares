// ─────────────────────────────────────────────────────────────
// Staffing Module Types — Independent from Family/Caregiver
// ─────────────────────────────────────────────────────────────

export type LicenseType = 'RN' | 'CNA' | 'LPN' | 'NP' | 'PT' | 'OT' | 'MA' | 'EMT' | 'Other';
export type FacilityType = 'hospital' | 'nursing_home' | 'clinic' | 'assisted_living' | 'rehab_center' | 'home_health' | 'other';

export type VerificationStatus = 'pending' | 'under_review' | 'approved' | 'rejected';

export type ShiftStatus = 'open' | 'filled' | 'cancelled' | 'completed';
export type BookingStatus =
  | 'awaiting_payment'
  | 'paid'
  | 'checked_in'
  | 'confirmed_start'
  | 'in_progress'
  | 'checked_out'
  | 'completed'
  | 'disputed'
  | 'cancelled';

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';
export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'dismissed';

// ── Professional Profile ──────────────────────────────────────
export interface ProfessionalProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  photo_url?: string;
  license_type: LicenseType;
  license_number?: string;
  license_state?: string;
  license_expiry?: string;
  specialties: string[];
  years_experience: number;
  bio?: string;
  location?: string;
  preferred_radius_miles: number;
  license_doc_url?: string;
  cert_doc_urls: string[];
  licenses?: {
    id: string;
    license_type: string;
    license_number: string;
    license_state: string;
    license_expiry?: string;
    license_doc_url?: string;
    verification_status: string;
  }[];
  verification_status: VerificationStatus;
  background_check_status: 'not_started' | 'pending' | 'approved' | 'rejected';
  account_status?: 'active' | 'suspended' | 'pending';
  created_at: string;
  updated_at: string;
}

// ── Facility Profile ──────────────────────────────────────────
export interface FacilityProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  photo_url?: string;
  facility_name: string;
  facility_type: FacilityType;
  ein?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  contact_name?: string;
  contact_title?: string;
  website?: string;
  verification_status: VerificationStatus;
  account_status?: 'active' | 'suspended' | 'pending';
  created_at: string;
  updated_at: string;
}

// ── Shift ─────────────────────────────────────────────────────
export interface Shift {
  id: string;
  ref_id: string;
  facility_id: string;
  facility_name?: string;
  facility_type?: string;
  role: LicenseType;
  specialty?: string;
  description?: string;
  pay_rate: number;
  duration_hours: number;
  total_pay: number;
  start_time: string;
  end_time: string;
  location: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  platform_fee_rate: number;
  status: ShiftStatus;
  slots_total: number;
  slots_filled: number;
  instant_book?: boolean;
  distanceMiles?: number | null;
  is_match?: boolean;
  applicant_count?: number;
  pending_applicants?: number;
  total_applicants?: number;
  created_at: string;
  updated_at: string;
}

// ── Application ───────────────────────────────────────────────
export interface ShiftApplication {
  id: string;
  shift_id: string;
  shift_ref?: string;
  professional_id: string;
  cover_note?: string;
  status: ApplicationStatus;
  applied_at: string;
  reviewed_at?: string;
  // Joined fields
  role?: string;
  pay_rate?: number;
  duration_hours?: number;
  total_pay?: number;
  start_time?: string;
  end_time?: string;
  location?: string;
  city?: string;
  state?: string;
  shift_status?: string;
  facility_name?: string;
  booking_id?: string;
  booking_status?: BookingStatus;
  booking_ref?: string;
  // For facility view
  name?: string;
  email?: string;
  photo_url?: string;
  phone?: string;
  license_type?: string;
  specialties?: string[];
  years_experience?: number;
  verification_status?: string;
  bio?: string;
}

// ── Booking ───────────────────────────────────────────────────
export interface ShiftBooking {
  id: string;
  ref_id: string;
  application_id: string;
  shift_id: string;
  professional_id: string;
  facility_id: string;
  wage_amount: number;
  platform_fee_amount: number;
  total_charged: number;
  status: BookingStatus;
  checked_in_at?: string;
  facility_confirmed_start_at?: string;
  checked_out_at?: string;
  facility_confirmed_complete_at?: string;
  stripe_payment_intent_id?: string;
  stripe_session_id?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  shift_role?: string;
  pay_rate?: number;
  duration_hours?: number;
  total_pay?: number;
  start_time?: string;
  end_time?: string;
  location?: string;
  city?: string;
  state?: string;
  facility_name?: string;
  facility_type?: string;
  professional_name?: string;
  license_type?: string;
  photo_url?: string;
}

// ── Wallet ────────────────────────────────────────────────────
export interface ProfessionalWallet {
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  transactions: WalletTransaction[];
  payouts?: {
    connectEnabled: boolean;
    onboardingStatus: 'not_started' | 'pending' | 'complete' | 'restricted';
    payoutsEnabled: boolean;
    hasAccount: boolean;
  };
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: 'credit' | 'debit' | 'withdrawal' | 'refund';
  amount: number;
  balance_after: number;
  description?: string;
  booking_id?: string;
  booking_ref?: string;
  created_at: string;
}

// ── Bank Account ──────────────────────────────────────────────
export interface BankAccount {
  id: string;
  bank_name: string;
  account_holder_name: string;
  account_number_last4: string;
  account_type: 'checking' | 'savings';
  created_at: string;
}

// ── Dispute ───────────────────────────────────────────────────
export interface ShiftDispute {
  id: string;
  ref_id: string;
  booking_id: string;
  booking_ref?: string;
  raised_by: string;
  raised_by_role: 'professional' | 'facility';
  raised_by_name?: string;
  reason: string;
  description?: string;
  status: DisputeStatus;
  resolution_notes?: string;
  resolved_at?: string;
  shift_role?: string;
  start_time?: string;
  location?: string;
  created_at: string;
  updated_at: string;
}
