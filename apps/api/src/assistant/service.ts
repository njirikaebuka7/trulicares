import { randomUUID } from 'node:crypto';
import { query } from '../db.js';
import type { AuthRequest } from '../middleware/auth.js';
import { getPublicSettings } from '../services/settings.js';
import { notifyAdmins } from '../services/notify.js';
import { findKnowledgeMatches, getStarterPrompts, type AssistantAudience } from './knowledge.js';

type StoredRole = 'user' | 'assistant';
type AnyJson = Record<string, unknown>;

export interface AssistantChatInput {
  conversationId?: string;
  guestToken?: string;
  message: string;
  pagePath?: string;
  pageTitle?: string;
}

export interface AssistantMessageDto {
  id: string;
  role: StoredRole;
  content: string;
  createdAt: string;
}

export interface AssistantContextDto {
  role: AssistantAudience;
  isAuthenticated: boolean;
  canUseAccountTools: boolean;
}

export interface AssistantConversationDto {
  conversationId: string;
  guestToken?: string;
  messages: AssistantMessageDto[];
  context: AssistantContextDto;
  starterPrompts: string[];
}

export interface AssistantChatResult {
  conversationId: string;
  guestToken?: string;
  assistantMessage: AssistantMessageDto;
  context: AssistantContextDto;
  starterPrompts: string[];
  escalated: boolean;
}

class AssistantError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function normalizeAudience(user?: AuthRequest['user']): AssistantAudience {
  if (!user) return 'guest';
  if (user.role === 'family' || user.role === 'caregiver' || user.role === 'professional' || user.role === 'facility' || user.role === 'admin') {
    return user.role;
  }
  return 'guest';
}

function buildContext(user?: AuthRequest['user']): AssistantContextDto {
  const role = normalizeAudience(user);
  return {
    role,
    isAuthenticated: !!user,
    canUseAccountTools: role !== 'guest' && role !== 'admin',
  };
}

function sanitizeIncomingMessage(input: string) {
  const trimmed = input.trim().replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  if (!trimmed) throw new AssistantError(400, 'Message is required');
  if (trimmed.length > 4000) throw new AssistantError(400, 'Message is too long');
  return redactSensitiveText(trimmed);
}

function redactSensitiveText(input: string) {
  return input
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[redacted-ssn]')
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, '[redacted-number]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]')
    .replace(/\+?\d[\d(). -]{7,}\d/g, '[redacted-phone]');
}

function formatStoredMessage(row: any): AssistantMessageDto {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
  };
}

function isEmergencyOrCrisis(message: string) {
  return /suicid|self-harm|kill myself|overdose|not breathing|chest pain|stroke|domestic violence|being abused|medical emergency|call 911|unsafe right now/i.test(
    message
  );
}

function explicitTicketIntent(message: string) {
  return /create (a )?ticket|submit (a )?ticket|contact support|reach support|human support|talk to support/i.test(message);
}

async function ensureConversation(input: AssistantChatInput, user?: AuthRequest['user']) {
  const role = normalizeAudience(user);
  const effectiveGuestToken = user ? undefined : input.guestToken || randomUUID();

  if (input.conversationId) {
    const existing = await query(
      `SELECT id, user_id, guest_token
       FROM assistant_conversations
       WHERE id = $1`,
      [input.conversationId]
    );
    const row = existing.rows[0];
    if (!row) throw new AssistantError(404, 'Conversation not found');

    const ownedByUser = !!user && row.user_id === user.id;
    const ownedByGuest = !user && !!effectiveGuestToken && row.guest_token === effectiveGuestToken;
    if (!ownedByUser && !ownedByGuest) {
      throw new AssistantError(404, 'Conversation not found');
    }

    await query(
      `UPDATE assistant_conversations
       SET page_path = COALESCE($2, page_path),
           role_snapshot = $3,
           updated_at = NOW()
       WHERE id = $1`,
      [input.conversationId, input.pagePath || null, role]
    );
    return { conversationId: input.conversationId, guestToken: effectiveGuestToken };
  }

  const created = await query(
    `INSERT INTO assistant_conversations (user_id, guest_token, role_snapshot, page_path)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [user?.id || null, effectiveGuestToken || null, role, input.pagePath || null]
  );

  return { conversationId: created.rows[0].id as string, guestToken: effectiveGuestToken };
}

async function persistMessage(conversationId: string, role: 'user' | 'assistant' | 'tool', content: string, meta: AnyJson = {}) {
  const saved = await query(
    `INSERT INTO assistant_messages (conversation_id, role, content, meta)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING id, role, content, created_at`,
    [conversationId, role, content, JSON.stringify(meta)]
  );

  await query(
    `UPDATE assistant_conversations
     SET title = COALESCE(title, $2),
         last_message_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [conversationId, content.slice(0, 80)]
  ).catch(() => {});

  return saved.rows[0];
}

async function getConversationMessages(conversationId: string, limit = 30) {
  const result = await query(
    `SELECT id, role, content, created_at
     FROM assistant_messages
     WHERE conversation_id = $1 AND role IN ('user', 'assistant')
     ORDER BY created_at ASC
     LIMIT $2`,
    [conversationId, limit]
  );
  return result.rows.map(formatStoredMessage);
}

async function fetchPublishedResources() {
  const result = await query(
    `SELECT title, slug, excerpt, category, read_time
     FROM blog_posts
     WHERE status = 'published'
     ORDER BY published_at DESC NULLS LAST, created_at DESC
     LIMIT 100`
  ).catch(() => ({ rows: [] as any[] }));
  return result.rows as Array<{ title: string; slug: string; excerpt: string; category: string; read_time: string }>;
}

function scoreResource(queryText: string, resource: { title: string; slug: string; excerpt: string; category: string }) {
  const tokens = queryText.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = `${resource.title} ${resource.excerpt || ''} ${resource.category || ''} ${resource.slug}`.toLowerCase();
  return tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}

async function searchKnowledge(queryText: string, audience: AssistantAudience, pagePath?: string) {
  const settings = await getPublicSettings().catch(() => ({
    platformName: 'TruliCares',
    socials: { facebook: '', instagram: '', youtube: '' },
    emails: ['support@trulicares.com'],
    phones: [],
    addresses: [],
    familyMatchingFee: '9.99',
    backgroundCheckFee: '39',
  }));

  const snippets = findKnowledgeMatches(queryText, audience, pagePath, 4);
  const resources = (await fetchPublishedResources())
    .map((resource) => ({ resource, score: scoreResource(queryText, resource) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => ({
      title: entry.resource.title,
      excerpt: entry.resource.excerpt,
      url: `/resources/${entry.resource.slug}`,
      category: entry.resource.category,
      readTime: entry.resource.read_time,
    }));

  const suggestedRoutes = Array.from(new Set(snippets.flatMap((snippet) => snippet.routes || []))).slice(0, 4);

  return {
    platformName: settings.platformName,
    snippets: snippets.map((snippet) => ({ title: snippet.title, content: snippet.content })),
    resources,
    suggestedRoutes,
    publicSettings: {
      supportEmail: settings.emails[0] || 'support@trulicares.com',
      supportPhones: settings.phones,
      familyMatchingFee: settings.familyMatchingFee,
      backgroundCheckFee: settings.backgroundCheckFee,
    },
  };
}

async function getFamilySnapshot(user: AuthRequest['user']) {
  const [requestsRes, matchesRes, sessionsRes, upcomingRes] = await Promise.all([
    query('SELECT COUNT(*) FROM care_requests WHERE family_id = $1', [user!.id]),
    query('SELECT COUNT(*) FROM matches WHERE family_id = $1', [user!.id]),
    query('SELECT COUNT(*) FROM schedules WHERE family_id = $1', [user!.id]),
    query(
      `SELECT service, date_label, time_label, location, status
       FROM schedules
       WHERE family_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [user!.id]
    ),
  ]);

  return {
    role: 'family',
    careRequestsCount: Number(requestsRes.rows[0]?.count || 0),
    matchesCount: Number(matchesRes.rows[0]?.count || 0),
    sessionsCount: Number(sessionsRes.rows[0]?.count || 0),
    latestSchedule: upcomingRes.rows[0]
      ? {
          service: upcomingRes.rows[0].service,
          date: upcomingRes.rows[0].date_label,
          time: upcomingRes.rows[0].time_label,
          location: upcomingRes.rows[0].location,
          status: upcomingRes.rows[0].status,
        }
      : null,
    nextRoutes: ['/find-care', '/caregivers', '/dashboard'],
  };
}

async function getCaregiverSnapshot(user: AuthRequest['user']) {
  const [profileRes, matchesRes, scheduleRes] = await Promise.all([
    query(
      `SELECT cp.job_title, cp.specialties, cp.verified, cp.background_checked, cp.background_check_status,
              cp.id_verification_status, cp.availability, cp.years_experience, cp.rating, cp.review_count
       FROM caregiver_profiles cp
       WHERE cp.user_id = $1`,
      [user!.id]
    ),
    query('SELECT COUNT(*) FROM matches WHERE caregiver_id = $1', [user!.id]),
    query('SELECT COUNT(*) FROM schedules WHERE caregiver_id = $1', [user!.id]),
  ]);

  const profile = profileRes.rows[0] || {};
  return {
    role: 'caregiver',
    jobTitle: profile.job_title || 'Caregiver',
    specialties: profile.specialties || [],
    verified: !!profile.verified,
    backgroundChecked: !!profile.background_checked,
    backgroundCheckStatus: profile.background_check_status || 'not_started',
    idVerificationStatus: profile.id_verification_status || 'none',
    availability: profile.availability || 'Flexible',
    yearsExperience: Number(profile.years_experience || 0),
    rating: Number(profile.rating || 0),
    reviewCount: Number(profile.review_count || 0),
    matchesCount: Number(matchesRes.rows[0]?.count || 0),
    sessionsCount: Number(scheduleRes.rows[0]?.count || 0),
    nextRoutes: ['/dashboard', '/provide-care'],
  };
}

async function getProfessionalSnapshot(user: AuthRequest['user']) {
  const profileRes = await query(
    `SELECT id, license_type, verification_status, background_check_status, completed_shifts,
            avg_rating, rating_count
     FROM professional_profiles
     WHERE user_id = $1`,
    [user!.id]
  );
  const profile = profileRes.rows[0];
  if (!profile) {
    return {
      role: 'professional',
      onboardingComplete: false,
      nextRoutes: ['/professional-onboarding'],
    };
  }

  const [walletRes, upcomingRes, applicationsRes, activeShiftRes] = await Promise.all([
    query(
      `SELECT balance, total_earned, total_withdrawn
       FROM professional_wallets
       WHERE user_id = $1`,
      [user!.id]
    ),
    query(`SELECT COUNT(*) FROM shift_bookings WHERE professional_id = $1 AND status IN ('paid', 'checked_in', 'in_progress')`, [profile.id]),
    query(`SELECT COUNT(*) FROM shift_applications WHERE professional_id = $1 AND status = 'pending'`, [profile.id]),
    query(
      `SELECT s.role, s.start_time, s.end_time, fp.facility_name
       FROM shift_bookings b
       JOIN shifts s ON s.id = b.shift_id
       JOIN facility_profiles fp ON fp.id = s.facility_id
       WHERE b.professional_id = $1
         AND b.status NOT IN ('cancelled', 'completed', 'disputed')
       ORDER BY s.start_time ASC
       LIMIT 1`,
      [profile.id]
    ),
  ]);

  const wallet = walletRes.rows[0] || { balance: 0, total_earned: 0, total_withdrawn: 0 };
  return {
    role: 'professional',
    onboardingComplete: true,
    licenseType: profile.license_type,
    verificationStatus: profile.verification_status || 'pending',
    backgroundCheckStatus: profile.background_check_status || 'not_started',
    completedShifts: Number(profile.completed_shifts || 0),
    rating: Number(profile.avg_rating || 0),
    ratingCount: Number(profile.rating_count || 0),
    wallet: {
      balance: Number(wallet.balance || 0),
      totalEarned: Number(wallet.total_earned || 0),
      totalWithdrawn: Number(wallet.total_withdrawn || 0),
    },
    upcomingShifts: Number(upcomingRes.rows[0]?.count || 0),
    pendingApplications: Number(applicationsRes.rows[0]?.count || 0),
    activeShift: activeShiftRes.rows[0]
      ? {
          role: activeShiftRes.rows[0].role,
          facilityName: activeShiftRes.rows[0].facility_name,
          startTime: activeShiftRes.rows[0].start_time,
          endTime: activeShiftRes.rows[0].end_time,
        }
      : null,
    nextRoutes: ['/professional-dashboard', '/professional-dashboard/browse', '/professional-dashboard/wallet'],
  };
}

async function getFacilitySnapshot(user: AuthRequest['user']) {
  const profileRes = await query(
    `SELECT id, facility_name, facility_type, verification_status, avg_rating, rating_count
     FROM facility_profiles
     WHERE user_id = $1`,
    [user!.id]
  );
  const profile = profileRes.rows[0];
  if (!profile) {
    return {
      role: 'facility',
      onboardingComplete: false,
      nextRoutes: ['/facility-onboarding'],
    };
  }

  const [openRes, filledRes, pendingRes, completedRes, professionalsRes] = await Promise.all([
    query(`SELECT COUNT(*) FROM shifts WHERE facility_id = $1 AND status = 'open'`, [profile.id]),
    query(`SELECT COUNT(*) FROM shifts WHERE facility_id = $1 AND status = 'filled'`, [profile.id]),
    query(
      `SELECT COUNT(*) FROM shift_applications sa
       JOIN shifts s ON s.id = sa.shift_id
       WHERE s.facility_id = $1 AND sa.status = 'pending'`,
      [profile.id]
    ),
    query(`SELECT COUNT(*) FROM shifts WHERE facility_id = $1 AND status = 'completed'`, [profile.id]),
    query(
      `SELECT COUNT(DISTINCT sa.professional_id) AS count
       FROM shift_applications sa
       JOIN shifts s ON s.id = sa.shift_id
       WHERE s.facility_id = $1`,
      [profile.id]
    ),
  ]);

  return {
    role: 'facility',
    onboardingComplete: true,
    facilityName: profile.facility_name,
    facilityType: profile.facility_type,
    verificationStatus: profile.verification_status || 'pending',
    rating: Number(profile.avg_rating || 0),
    ratingCount: Number(profile.rating_count || 0),
    stats: {
      openShifts: Number(openRes.rows[0]?.count || 0),
      filledShifts: Number(filledRes.rows[0]?.count || 0),
      pendingApplicants: Number(pendingRes.rows[0]?.count || 0),
      completedShifts: Number(completedRes.rows[0]?.count || 0),
      totalProfessionals: Number(professionalsRes.rows[0]?.count || 0),
    },
    nextRoutes: ['/facility-dashboard', '/facility-dashboard/post', '/facility-dashboard/shifts'],
  };
}

async function getAccountSnapshot(user?: AuthRequest['user']) {
  if (!user) throw new AssistantError(403, 'Authentication is required for account help');
  if (user.role === 'family') return getFamilySnapshot(user);
  if (user.role === 'caregiver') return getCaregiverSnapshot(user);
  if (user.role === 'professional') return getProfessionalSnapshot(user);
  if (user.role === 'facility') return getFacilitySnapshot(user);
  throw new AssistantError(403, 'Account summaries are not enabled for this role');
}

function formatKnowledgeSummary(knowledge: Awaited<ReturnType<typeof searchKnowledge>>) {
  const parts: string[] = [];
  if (knowledge.snippets.length > 0) {
    parts.push(
      knowledge.snippets
        .map((snippet) => `${snippet.title}: ${snippet.content}`)
        .join('\n')
    );
  }
  if (knowledge.resources.length > 0) {
    parts.push(
      `Helpful resources: ${knowledge.resources
        .map((resource) => `${resource.title} (${resource.url})`)
        .join('; ')}`
    );
  }
  if (knowledge.suggestedRoutes.length > 0) {
    parts.push(`Useful pages: ${knowledge.suggestedRoutes.join(', ')}`);
  }
  parts.push(
    `Support email: ${knowledge.publicSettings.supportEmail}. Family messaging unlock fee: $${knowledge.publicSettings.familyMatchingFee}. Background check fee: $${knowledge.publicSettings.backgroundCheckFee}.`
  );
  return parts.join('\n\n');
}

function formatSnapshot(snapshot: any) {
  if (snapshot.role === 'family') {
    const schedule = snapshot.latestSchedule
      ? `Your latest scheduled session is ${snapshot.latestSchedule.service} on ${snapshot.latestSchedule.date} at ${snapshot.latestSchedule.time}.`
      : 'You do not have a scheduled session yet.';
    return `You currently have ${snapshot.careRequestsCount} care requests, ${snapshot.matchesCount} matches, and ${snapshot.sessionsCount} scheduled sessions. ${schedule}`;
  }
  if (snapshot.role === 'caregiver') {
    return `Your profile shows ${snapshot.jobTitle}, ${snapshot.yearsExperience} years of experience, availability set to ${snapshot.availability}, ${snapshot.matchesCount} matches, and ${snapshot.sessionsCount} scheduled sessions. Verification status: ${snapshot.idVerificationStatus}. Background check status: ${snapshot.backgroundCheckStatus}.`;
  }
  if (snapshot.role === 'professional') {
    if (!snapshot.onboardingComplete) {
      return 'Your professional staffing onboarding is not complete yet. The next step is to finish setup at /professional-onboarding.';
    }
    const activeShift = snapshot.activeShift
      ? `Your next active shift is ${snapshot.activeShift.role} at ${snapshot.activeShift.facilityName}.`
      : 'You do not have an active shift right now.';
    return `Your staffing account shows verification status ${snapshot.verificationStatus}, background check status ${snapshot.backgroundCheckStatus}, wallet balance $${snapshot.wallet.balance.toFixed(2)}, ${snapshot.upcomingShifts} upcoming shifts, and ${snapshot.pendingApplications} pending applications. ${activeShift}`;
  }
  if (snapshot.role === 'facility') {
    if (!snapshot.onboardingComplete) {
      return 'Your facility onboarding is not complete yet. The next step is /facility-onboarding.';
    }
    return `${snapshot.facilityName || 'Your facility'} has ${snapshot.stats.openShifts} open shifts, ${snapshot.stats.filledShifts} filled shifts, ${snapshot.stats.pendingApplicants} pending applicants, and ${snapshot.stats.totalProfessionals} distinct professionals in the applicant pool so far. Verification status: ${snapshot.verificationStatus}.`;
  }
  return 'I can help with general platform guidance, but I do not have account tools for this role.';
}

async function createSupportTicket(args: {
  user?: AuthRequest['user'];
  subject?: string;
  message?: string;
  category?: string;
  email?: string;
  name?: string;
  confirm?: boolean;
}) {
  if (!args.confirm) {
    throw new AssistantError(400, 'Please confirm before I submit a support ticket.');
  }
  const subject = (args.subject || '').trim();
  const message = (args.message || '').trim();
  const email = (args.user?.email || args.email || '').trim().toLowerCase();
  if (!subject || !message || !email) {
    throw new AssistantError(400, 'A support ticket needs an email, subject, and message.');
  }

  const created = await query(
    `INSERT INTO support_tickets (user_id, name, email, subject, message, category)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, status`,
    [args.user?.id || null, args.name || args.user?.name || null, email, subject, message, args.category || 'assistant']
  );

  await notifyAdmins({
    subject: 'New assistant support ticket',
    heading: 'Assistant escalated a support ticket',
    message: `${args.name || args.user?.name || email}: ${subject}`,
  }).catch(() => {});

  return {
    ticketId: created.rows[0].id,
    status: created.rows[0].status,
    email,
  };
}

function wantsAccountHelp(message: string) {
  return /\b(my|account|status|wallet|shift|schedule|match|profile|verification|payment|applicants|requests)\b/i.test(message);
}

function wantsVerificationHelp(message: string) {
  return /\b(verification|verified|background check|license|credential|approve|approval)\b/i.test(message);
}

function wantsPricingHelp(message: string) {
  return /\b(price|pricing|cost|fee|fees|how much|pay)\b/i.test(message);
}

function wantsContactHelp(message: string) {
  return /\b(contact|email|phone|call|support team|human support)\b/i.test(message) && !explicitTicketIntent(message);
}

function wantsCapabilityHelp(message: string) {
  return /\b(what can you do|how can you help|help me|what do you do|who are you)\b/i.test(message);
}

function wantsRouteHelp(message: string) {
  return /\b(where|which page|what page|next step|go to|navigate|start|how do i)\b/i.test(message);
}

function wantsResourceHelp(message: string) {
  return /\b(resource|resources|guide|guides|article|articles|blog|faq|learn more|read more)\b/i.test(message);
}

function formatRouteSuggestions(routes: string[]) {
  const unique = Array.from(new Set(routes)).filter(Boolean);
  if (unique.length === 0) return '';
  if (unique.length === 1) return unique[0];
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`;
  return `${unique.slice(0, -1).join(', ')}, and ${unique[unique.length - 1]}`;
}

function formatContactReply(knowledge: Awaited<ReturnType<typeof searchKnowledge>>) {
  const parts = [`You can reach the TruliCares team from /contact or by email at ${knowledge.publicSettings.supportEmail}.`];
  if (knowledge.publicSettings.supportPhones.length > 0) {
    parts.push(`Phone support listed in the app: ${knowledge.publicSettings.supportPhones.join(', ')}.`);
  }
  return parts.join(' ');
}

function buildCapabilitiesReply(context: AssistantContextDto) {
  if (context.canUseAccountTools) {
    return 'I can explain how TruliCares works, point you to the right in-app pages, summarize your own account status, and help you escalate to human support when needed.';
  }
  return 'I can explain how TruliCares works, help you understand care and staffing flows, point you to the right pages, and guide you to human support when needed.';
}

function buildKnowledgeReply(knowledge: Awaited<ReturnType<typeof searchKnowledge>>) {
  const pieces: string[] = [];

  if (knowledge.snippets.length > 0) {
    pieces.push(
      knowledge.snippets
        .slice(0, 2)
        .map((snippet) => `${snippet.title}: ${snippet.content}`)
        .join('\n\n')
    );
  }

  if (knowledge.resources.length > 0) {
    pieces.push(
      `Related resources: ${knowledge.resources
        .slice(0, 2)
        .map((resource) => `${resource.title} (${resource.url})`)
        .join('; ')}`
    );
  }

  if (knowledge.suggestedRoutes.length > 0) {
    pieces.push(`Helpful pages: ${formatRouteSuggestions(knowledge.suggestedRoutes)}.`);
  }

  return pieces.join('\n\n').trim();
}

function extractSupportTicketDraft(message: string) {
  const subjectMatch = message.match(/subject\s*:\s*([^\n]+)/i);
  const bodyMatch = message.match(/(?:message|details)\s*:\s*([\s\S]+)/i);
  const emailMatch = message.match(/email\s*:\s*([^\s]+@[^\s]+)/i);
  return {
    subject: subjectMatch?.[1]?.trim() || '',
    message: bodyMatch?.[1]?.trim() || '',
    email: emailMatch?.[1]?.trim() || '',
  };
}

function findPreviousUserIssue(history: AssistantMessageDto[], currentMessage: string) {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const item = history[i];
    if (item.role !== 'user') continue;
    if (item.content === currentMessage) continue;
    if (explicitTicketIntent(item.content)) continue;
    return item.content;
  }
  return '';
}

async function generateGroundedReply(
  conversationId: string,
  currentMessage: string,
  context: AssistantContextDto,
  user: AuthRequest['user'] | undefined,
  pagePath?: string
) {
  const knowledge = await searchKnowledge(currentMessage, context.role, pagePath);
  const history = await getConversationMessages(conversationId, 12);
  const pieces: string[] = [];
  let escalated = false;

  if (explicitTicketIntent(currentMessage)) {
    const draft = extractSupportTicketDraft(currentMessage);
    const previousIssue = findPreviousUserIssue(history, currentMessage);
    const ticketMessage = draft.message || previousIssue;
    const ticketSubject = draft.subject || (ticketMessage ? ticketMessage.slice(0, 72).replace(/\s+/g, ' ').trim() : '');

    if (ticketSubject && ticketMessage && (user || draft.email)) {
      const ticket = await createSupportTicket({
        user,
        email: draft.email || undefined,
        subject: ticketSubject,
        message: ticketMessage,
        category: 'assistant',
        confirm: true,
      });
      return {
        text: `I submitted a support ticket for you. Ticket ID: ${ticket.ticketId}. The TruliCares team will follow up through ${ticket.email}.`,
        escalated: true,
      };
    }

    const missing = [
      !user && !draft.email ? 'email' : '',
      !ticketSubject ? 'subject' : '',
      !ticketMessage ? 'message' : '',
    ].filter(Boolean);

    return {
      text: `I can submit that to the TruliCares team. Please send ${missing.join(', ')} in this format:\nsubject: Brief summary\nmessage: What happened and what you need${user ? '' : '\nemail: your@email.com'}\n\nYou can also reach support at /contact.`,
      escalated: false,
    };
  }

  if (wantsContactHelp(currentMessage)) {
    pieces.push(formatContactReply(knowledge));
  }

  if (wantsCapabilityHelp(currentMessage)) {
    pieces.push(buildCapabilitiesReply(context));
  }

  if (context.canUseAccountTools && (wantsAccountHelp(currentMessage) || wantsVerificationHelp(currentMessage))) {
    const snapshot = await getAccountSnapshot(user);
    pieces.push(formatSnapshot(snapshot));
    if (Array.isArray(snapshot.nextRoutes) && snapshot.nextRoutes.length > 0) {
      pieces.push(`Best next page: ${formatRouteSuggestions(snapshot.nextRoutes)}.`);
    }
  }

  if (wantsPricingHelp(currentMessage)) {
    if (/background/i.test(currentMessage)) {
      pieces.push(`The current background check fee configured in the app is $${knowledge.publicSettings.backgroundCheckFee}.`);
    }
    if (/message|match|family/i.test(currentMessage) || pieces.length === 0) {
      pieces.push(`The current family messaging unlock fee configured in the app is $${knowledge.publicSettings.familyMatchingFee}.`);
    }
  }

  const knowledgeReply = buildKnowledgeReply(knowledge);
  if (knowledgeReply) {
    pieces.push(knowledgeReply);
  }

  if (pieces.length === 0) {
    pieces.push(buildCapabilitiesReply(context));
    if (knowledge.suggestedRoutes.length > 0) {
      pieces.push(`A good place to start is ${formatRouteSuggestions(knowledge.suggestedRoutes)}.`);
    }
  } else if ((wantsRouteHelp(currentMessage) || wantsResourceHelp(currentMessage)) && knowledge.resources.length > 0) {
    pieces.push(
      `You may also want to read ${knowledge.resources
        .slice(0, 2)
        .map((resource) => `${resource.title} (${resource.url})`)
        .join('; ')}.`
    );
  }

  if (pagePath && pagePath !== '/' && knowledge.suggestedRoutes.includes(pagePath)) {
    pieces.push(`Since you are already on ${pagePath}, that page is part of the right flow for this question.`);
  }

  return {
    text: pieces.join('\n\n').trim(),
    escalated,
  };
}

function crisisReply() {
  return [
    'If someone is in immediate danger or this may be an emergency, please contact local emergency services right away.',
    'I can help with TruliCares platform support after you are safe, but I am not a substitute for emergency, medical, or crisis professionals.',
    'If you still need TruliCares support afterward, I can help you contact the team or create a support ticket.',
  ].join(' ');
}

export async function getConversationForViewer(conversationId: string, guestToken?: string, user?: AuthRequest['user']): Promise<AssistantConversationDto> {
  const context = buildContext(user);
  const existing = await query(
    `SELECT id, user_id, guest_token
     FROM assistant_conversations
     WHERE id = $1`,
    [conversationId]
  );
  const row = existing.rows[0];
  if (!row) throw new AssistantError(404, 'Conversation not found');

  const canRead = (user && row.user_id === user.id) || (!user && guestToken && row.guest_token === guestToken);
  if (!canRead) throw new AssistantError(404, 'Conversation not found');

  return {
    conversationId,
    guestToken: !user ? guestToken : undefined,
    messages: await getConversationMessages(conversationId),
    context,
    starterPrompts: getStarterPrompts(context.role),
  };
}

export async function chatWithAssistant(input: AssistantChatInput, user?: AuthRequest['user']): Promise<AssistantChatResult> {
  const context = buildContext(user);
  const cleanMessage = sanitizeIncomingMessage(input.message);
  const conversation = await ensureConversation({ ...input, message: cleanMessage }, user);

  await persistMessage(conversation.conversationId, 'user', cleanMessage, {
    pagePath: input.pagePath || null,
    pageTitle: input.pageTitle || null,
  });

  let reply = '';
  let escalated = false;

  if (isEmergencyOrCrisis(cleanMessage)) {
    reply = crisisReply();
    escalated = true;
  } else {
    try {
      const grounded = await generateGroundedReply(
        conversation.conversationId,
        cleanMessage,
        context,
        user,
        input.pagePath
      );
      reply = grounded.text;
      escalated = grounded.escalated;
    } catch (err) {
      console.error('Assistant generation failed:', err);
      const knowledge = await searchKnowledge(cleanMessage, context.role, input.pagePath);
      reply = buildKnowledgeReply(knowledge) || buildCapabilitiesReply(context);
    }
  }

  const savedAssistant = await persistMessage(conversation.conversationId, 'assistant', redactSensitiveText(reply), {
    escalated,
    engine: 'grounded',
  });

  return {
    conversationId: conversation.conversationId,
    guestToken: conversation.guestToken,
    assistantMessage: formatStoredMessage(savedAssistant),
    context,
    starterPrompts: getStarterPrompts(context.role),
    escalated,
  };
}

export function isAssistantError(err: unknown): err is AssistantError {
  return err instanceof AssistantError;
}
