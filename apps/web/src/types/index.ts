// Care categories
export type CareCategory = 'child-care' | 'senior-care' | 'adult-care' | 'cleaning';

// Care request data types
export interface ChildCareData {
  numberOfChildren: number;
  childrenAges: number[];
  careType: string;
  startDate: string;
  days: string[];
  timeSlot: string;
  frequency: string;
  helpNeeded: string[];
  specialNeeds: string;
  location: string;
  payRange: [number, number];
}

export interface SeniorCareData {
  age: number;
  careType: string;
  mobilityLevel: string;
  helpNeeded: string[];
  startDate: string;
  days: string[];
  timeSlot: string;
  frequency: string;
  location: string;
  payRange: [number, number];
}

export interface AdultCareData {
  age: number;
  supportType: string;
  independenceLevel: string;
  tasksNeeded: string[];
  startDate: string;
  days: string[];
  timeSlot: string;
  frequency: string;
  location: string;
  payRange: [number, number];
}

export interface CleaningData {
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: string;
  cleaningType: string;
  frequency: string;
  areasToClean: string[];
  suppliesProvided: boolean | null;
  petsInHome: boolean | null;
  preferredDate: string;
  timeWindow: string;
  specialInstructions: string;
  location: string;
  payRange: [number, number];
}

export type CareData = ChildCareData | SeniorCareData | AdultCareData | CleaningData;

export interface CareRequest {
  category: CareCategory;
  data: CareData;
  status: 'draft' | 'submitted' | 'matching' | 'matched';
}

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'family' | 'caregiver' | 'admin' | 'support_admin' | 'professional' | 'facility';
  verified: boolean;
  avatarUrl?: string;
  photoUrl?: string;
  phone?: string;
  status?: 'active' | 'suspended';
}

export interface CaregiverProfile extends User {
  role: 'caregiver';
  bio: string;
  specialties: CareCategory[];
  hourlyRate: [number, number];
  rating: number;
  reviewCount: number;
  location: string;
  verified: boolean;
  backgroundChecked: boolean;
  yearsExperience: number;
  availability: string;
  photoUrl?: string;
  serviceZips?: string[];
  jobTitle?: string;
  languages?: string[];
  education?: string;
  certifications?: { id?: string; name?: string; issuer?: string; year?: string }[] | string[];
  distanceMiles?: number;
}

export interface CareMatch {
  id: string;
  careRequestId: string;
  caregiver: CaregiverProfile;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  careType: CareCategory;
  budget: string;
  location: string;
  messagingUnlocked: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
}

// Testimonial
export interface Testimonial {
  id: string;
  name: string;
  role: string;
  text: string;
  rating: number;
  avatarInitials: string;
}
