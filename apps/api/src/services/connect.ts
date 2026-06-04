/**
 * Stripe Connect (Express) — payout infrastructure for professionals.
 *
 * DESIGN: everything here degrades gracefully. The DB fields, endpoints and UI states
 * exist whether or not Connect is live. Real money only moves when:
 *   1. STRIPE_CONNECT_ENABLED === 'true'  AND
 *   2. STRIPE_SECRET_KEY is configured    AND
 *   3. the professional has finished onboarding (payouts_enabled === true).
 * Otherwise calls return a CONNECT_NOT_ENABLED / ONBOARDING_INCOMPLETE result and the
 * internal wallet ledger keeps tracking earnings until payouts can be turned on.
 */
import Stripe from 'stripe';
import { query } from '../db.js';

export type ConnectGateReason = 'CONNECT_NOT_ENABLED' | 'NO_ACCOUNT' | 'ONBOARDING_INCOMPLETE';

/** True only when Connect is switched on AND a Stripe key is present. */
export function isConnectEnabled(): boolean {
  return process.env.STRIPE_CONNECT_ENABLED === 'true' && !!process.env.STRIPE_SECRET_KEY;
}

function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key);
}

function appUrl(): string {
  return process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5173';
}

interface ProConnectRow {
  id: string;
  stripe_connected_account_id: string | null;
  stripe_onboarding_status: string;
  stripe_payouts_enabled: boolean;
  email: string | null;
  name: string | null;
}

async function getProConnect(userId: string): Promise<ProConnectRow | null> {
  const res = await query(
    `SELECT pp.id, pp.stripe_connected_account_id, pp.stripe_onboarding_status,
            pp.stripe_payouts_enabled, u.email, u.name
     FROM professional_profiles pp
     JOIN users u ON u.id = pp.user_id
     WHERE pp.user_id = $1`,
    [userId]
  );
  return res.rows[0] || null;
}

/**
 * Ensure the professional has a Stripe Express connected account, creating one if needed.
 * Returns the account id. Throws if Connect is disabled or no profile exists.
 */
export async function getOrCreateConnectAccount(userId: string): Promise<string> {
  if (!isConnectEnabled()) {
    const err: any = new Error('Stripe Connect is not enabled');
    err.code = 'CONNECT_NOT_ENABLED';
    throw err;
  }
  const pro = await getProConnect(userId);
  if (!pro) {
    const err: any = new Error('Professional profile not found');
    err.code = 'NO_PROFILE';
    throw err;
  }
  if (pro.stripe_connected_account_id) return pro.stripe_connected_account_id;

  const account = await stripe().accounts.create({
    type: 'express',
    email: pro.email || undefined,
    business_type: 'individual',
    capabilities: {
      transfers: { requested: true },
    },
    business_profile: {
      product_description: 'Healthcare staffing — per-shift work via TruliCares',
    },
    metadata: { user_id: userId, professional_id: pro.id },
  });

  await query(
    `UPDATE professional_profiles
     SET stripe_connected_account_id = $1, stripe_onboarding_status = 'pending'
     WHERE user_id = $2`,
    [account.id, userId]
  );
  return account.id;
}

/** Create a hosted onboarding (AccountLink) URL the professional can complete KYC at. */
export async function createOnboardingLink(userId: string): Promise<string> {
  const accountId = await getOrCreateConnectAccount(userId);
  const link = await stripe().accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl()}/professional-dashboard/wallet?connect=refresh`,
    return_url: `${appUrl()}/professional-dashboard/wallet?connect=return`,
    type: 'account_onboarding',
  });
  return link.url;
}

/** Pull the latest account state from Stripe and persist payouts/charges enabled + status. */
export async function refreshConnectStatus(userId: string): Promise<{
  status: string;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
}> {
  const pro = await getProConnect(userId);
  if (!pro?.stripe_connected_account_id) {
    return { status: pro?.stripe_onboarding_status || 'not_started', payoutsEnabled: false, chargesEnabled: false, detailsSubmitted: false };
  }
  if (!isConnectEnabled()) {
    return { status: pro.stripe_onboarding_status, payoutsEnabled: false, chargesEnabled: false, detailsSubmitted: false };
  }

  const account = await stripe().accounts.retrieve(pro.stripe_connected_account_id);
  return persistAccountState(account);
}

/** Shared by status refresh + the account.updated webhook. */
export async function persistAccountState(account: Stripe.Account): Promise<{
  status: string; payoutsEnabled: boolean; chargesEnabled: boolean; detailsSubmitted: boolean;
}> {
  const payoutsEnabled = !!account.payouts_enabled;
  const chargesEnabled = !!account.charges_enabled;
  const detailsSubmitted = !!account.details_submitted;
  let status: string;
  if (payoutsEnabled && detailsSubmitted) status = 'complete';
  else if (detailsSubmitted) status = 'pending'; // submitted but Stripe still verifying
  else if (account.requirements?.disabled_reason) status = 'restricted';
  else status = 'pending';

  await query(
    `UPDATE professional_profiles
     SET stripe_onboarding_status = $1,
         stripe_payouts_enabled = $2,
         stripe_charges_enabled = $3,
         stripe_onboarded_at = CASE WHEN $2 AND stripe_onboarded_at IS NULL THEN NOW() ELSE stripe_onboarded_at END
     WHERE stripe_connected_account_id = $4`,
    [status, payoutsEnabled, chargesEnabled, account.id]
  );
  return { status, payoutsEnabled, chargesEnabled, detailsSubmitted };
}

export interface PayoutResult {
  mode: 'transferred' | 'wallet';
  gateReason?: ConnectGateReason;
  transferId?: string;
  amount: number;
}

/**
 * Attempt a real Connect transfer of `amount` to the professional's connected account.
 * If Connect is off or the pro isn't onboarded, returns { mode: 'wallet' } so the caller
 * leaves the funds in the internal wallet for a later (gated) withdrawal — NO fake payout.
 *
 * The platform keeps its fee automatically: only the wage `amount` is transferred; the
 * fee remains on the platform's Stripe balance from the original facility charge.
 */
export async function transferToProfessional(opts: {
  userId: string;
  amount: number;
  bookingId?: string | null;
  bookingRef?: string | null;
  sourcePaymentIntentId?: string | null;
  type?: 'instant' | 'manual';
}): Promise<PayoutResult> {
  const { userId, amount, bookingId = null, bookingRef = null, type = 'instant' } = opts;

  if (!isConnectEnabled()) return { mode: 'wallet', gateReason: 'CONNECT_NOT_ENABLED', amount };

  const pro = await getProConnect(userId);
  if (!pro?.stripe_connected_account_id) return { mode: 'wallet', gateReason: 'NO_ACCOUNT', amount };
  if (!pro.stripe_payouts_enabled) return { mode: 'wallet', gateReason: 'ONBOARDING_INCOMPLETE', amount };

  // Record the payout attempt first so we have an audit trail even if the transfer throws.
  const payoutRow = await query(
    `INSERT INTO payouts (user_id, booking_id, amount, type, status)
     VALUES ($1, $2, $3, $4, 'pending')
     RETURNING id`,
    [userId, bookingId, amount, type]
  );
  const payoutId = payoutRow.rows[0].id;

  try {
    const transfer = await stripe().transfers.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      destination: pro.stripe_connected_account_id,
      description: bookingRef ? `Shift payout ${bookingRef}` : 'Shift payout',
      metadata: { user_id: userId, booking_id: bookingId || '', payout_id: payoutId },
    });

    await query(
      `UPDATE payouts SET status = 'paid', stripe_transfer_id = $1, processed_at = NOW() WHERE id = $2`,
      [transfer.id, payoutId]
    );
    return { mode: 'transferred', transferId: transfer.id, amount };
  } catch (err: any) {
    await query(
      `UPDATE payouts SET status = 'failed', failure_reason = $1, processed_at = NOW() WHERE id = $2`,
      [err?.message?.slice(0, 300) || 'transfer failed', payoutId]
    ).catch(() => {});
    // Re-throw so the caller can decide; the wallet credit already happened upstream.
    throw err;
  }
}
