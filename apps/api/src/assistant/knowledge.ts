export type AssistantAudience = 'guest' | 'family' | 'caregiver' | 'professional' | 'facility' | 'admin';

export interface KnowledgeSnippet {
  id: string;
  title: string;
  content: string;
  audiences: AssistantAudience[];
  keywords: string[];
  routes?: string[];
}

const SNIPPETS: KnowledgeSnippet[] = [
  {
    id: 'platform-overview',
    title: 'Platform overview',
    audiences: ['guest', 'family', 'caregiver', 'professional', 'facility', 'admin'],
    keywords: ['what is trulicares', 'how does trulicares work', 'overview', 'platform'],
    routes: ['/', '/services', '/resources', '/contact'],
    content:
      'TruliCares has two main experiences in one product. Families can find and match with caregivers for child care, senior care, adult care, and cleaning services. Healthcare professionals and facilities can also use the staffing marketplace for verified shift-based work and bookings.',
  },
  {
    id: 'family-flow',
    title: 'Family care request flow',
    audiences: ['guest', 'family'],
    keywords: ['find care', 'care request', 'family dashboard', 'hire caregiver', 'matching'],
    routes: ['/find-care', '/caregivers', '/dashboard'],
    content:
      'Families start in the guided questionnaire at /find-care, submit a care request, review matches, and unlock messaging once they want to connect with an accepted caregiver. The family dashboard is the main place to track requests, matches, and schedules.',
  },
  {
    id: 'family-payments',
    title: 'Family payments and messaging unlock',
    audiences: ['guest', 'family'],
    keywords: ['price', 'pricing', 'messaging unlock', 'matching fee', 'family payment'],
    routes: ['/resources', '/dashboard'],
    content:
      'Families pay a small messaging unlock fee when a caregiver accepts their request and they want to begin direct messaging. Caregiver wages are paid directly to the caregiver. TruliCares does not position itself as holding caregiver wages for the family-care marketplace.',
  },
  {
    id: 'service-lines',
    title: 'Service categories',
    audiences: ['guest', 'family', 'caregiver'],
    keywords: ['services', 'child care', 'senior care', 'adult care', 'cleaning'],
    routes: ['/services'],
    content:
      'The public care marketplace covers four service lines: Child Care, Senior Care, Adult Care, and Cleaning Services. Child care includes nannies, babysitters, and daycare-style support. Senior care includes companionship, mobility help, medication reminders, and personal care support. Adult care focuses on daily living, behavioral, and community support. Cleaning covers standard, deep, move-in or move-out, and recurring cleaning.',
  },
  {
    id: 'caregiver-flow',
    title: 'Caregiver marketplace flow',
    audiences: ['guest', 'caregiver'],
    keywords: ['caregiver', 'profile', 'verification', 'background check', 'caregiver dashboard'],
    routes: ['/provide-care', '/dashboard'],
    content:
      'Caregivers create a free profile, complete their biography, specialties, rates, and availability, and then manage their progress from the caregiver dashboard. Verification and background-check status are tracked on the profile so families can make informed decisions from visible trust signals rather than hidden claims.',
  },
  {
    id: 'professional-flow',
    title: 'Healthcare professional staffing flow',
    audiences: ['guest', 'professional'],
    keywords: ['professional', 'shifts', 'wallet', 'license', 'per diem', 'travel'],
    routes: ['/for-professionals', '/professional-onboarding', '/professional-dashboard'],
    content:
      'Healthcare professionals create a profile, submit license and credential details, complete verification and background-check steps, then browse shifts from the professional dashboard. The staffing experience is built around flexible scheduling, fast wallet payouts, and escrow-protected shift payments.',
  },
  {
    id: 'facility-flow',
    title: 'Facility staffing flow',
    audiences: ['guest', 'facility'],
    keywords: ['facility', 'post shift', 'applicants', 'staffing', 'book professionals'],
    routes: ['/for-facilities', '/facility-onboarding', '/facility-dashboard'],
    content:
      'Facilities set up their profile, post shifts, review verified applicants, and confirm bookings from the facility dashboard. The staffing marketplace emphasizes verified professionals, fast shift posting, and escrow-protected payments rather than long-term agency contracts.',
  },
  {
    id: 'resources-support',
    title: 'Resources and support',
    audiences: ['guest', 'family', 'caregiver', 'professional', 'facility', 'admin'],
    keywords: ['resources', 'blog', 'contact', 'support', 'help'],
    routes: ['/resources', '/contact'],
    content:
      'The /resources page contains published guides and FAQs about care, verification, hiring, and family wellbeing. The /contact page is the best manual escalation path when the assistant cannot safely resolve a problem or when a user needs direct human support.',
  },
  {
    id: 'staffing-payments',
    title: 'Staffing payments and payout model',
    audiences: ['guest', 'professional', 'facility'],
    keywords: ['wallet', 'payout', 'escrow', 'staffing fee', 'professional pay', 'facility payment'],
    routes: ['/for-professionals', '/for-facilities', '/professional-dashboard/wallet'],
    content:
      'In the staffing marketplace, facilities fund bookings securely and professionals receive earnings through the TruliCares wallet after shift completion. Payout readiness depends on the professional completing payout onboarding and any required verification steps.',
  },
  {
    id: 'account-help',
    title: 'Account access basics',
    audiences: ['guest', 'family', 'caregiver', 'professional', 'facility', 'admin'],
    keywords: ['login', 'password', 'reset password', 'dashboard', 'account'],
    routes: ['/login', '/reset-password', '/dashboard', '/professional-dashboard', '/facility-dashboard'],
    content:
      'Users sign in at /login and can reset access from /reset-password. Logged-in users should rely on their own dashboard for live account state. The assistant can explain flows and summarize permitted account data, but it should not ask for passwords, card numbers, government IDs, or private documents in chat.',
  },
  {
    id: 'safety-boundary',
    title: 'Safety and emergency boundary',
    audiences: ['guest', 'family', 'caregiver', 'professional', 'facility', 'admin'],
    keywords: ['emergency', 'urgent', 'medical advice', 'legal advice', 'unsafe'],
    routes: ['/contact'],
    content:
      'The assistant is for product support and workflow guidance only. It must not act as emergency response, medical advice, legal advice, or crisis counseling. If someone may be in immediate danger, the correct response is emergency services or an appropriate local crisis resource, followed by human support from TruliCares when safe.',
  },
];

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9/-]+/g, ' ').trim();
}

function tokenize(value: string) {
  return normalizeToken(value).split(/\s+/).filter(Boolean);
}

function audienceWeight(snippet: KnowledgeSnippet, audience: AssistantAudience) {
  if (snippet.audiences.includes(audience)) return 3;
  if (snippet.audiences.includes('guest')) return 1;
  return 0;
}

function scoreSnippet(snippet: KnowledgeSnippet, query: string, audience: AssistantAudience, pagePath?: string) {
  const queryTokens = tokenize(query);
  const haystack = normalizeToken(
    `${snippet.title} ${snippet.content} ${snippet.keywords.join(' ')} ${snippet.routes?.join(' ') || ''}`
  );

  let score = audienceWeight(snippet, audience);
  for (const token of queryTokens) {
    if (haystack.includes(token)) score += 2;
  }
  for (const keyword of snippet.keywords) {
    if (query.toLowerCase().includes(keyword.toLowerCase())) score += 3;
  }
  if (pagePath && snippet.routes?.some((route) => pagePath.startsWith(route))) {
    score += 2;
  }
  return score;
}

export function getStarterPrompts(audience: AssistantAudience) {
  if (audience === 'family') {
    return [
      'Can you summarize my account?',
      'How do I post a care request?',
      'How does messaging unlock work?',
      'What should I do if a match is not the right fit?',
    ];
  }
  if (audience === 'caregiver') {
    return [
      'Can you summarize my profile status?',
      'How do verification badges work?',
      'What can families see on my profile?',
      'How do I prepare for better matches?',
    ];
  }
  if (audience === 'professional') {
    return [
      'Can you summarize my staffing account?',
      'How do wallet payouts work?',
      'What do I need before applying to shifts?',
      'How do I finish verification?',
    ];
  }
  if (audience === 'facility') {
    return [
      'Can you summarize my facility account?',
      'How do I post a shift?',
      'How do escrow-protected bookings work?',
      'What can I review before accepting an applicant?',
    ];
  }
  return [
    'How does TruliCares work?',
    'What services do you offer?',
    'How do I become a caregiver or professional?',
    'How can I contact support?',
  ];
}

export function findKnowledgeMatches(query: string, audience: AssistantAudience, pagePath?: string, limit = 4) {
  return SNIPPETS
    .map((snippet) => ({ snippet, score: scoreSnippet(snippet, query, audience, pagePath) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.snippet);
}
