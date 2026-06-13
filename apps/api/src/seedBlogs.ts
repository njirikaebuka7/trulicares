import 'dotenv/config';
import { pool } from './db.js';

// Six SEO-oriented blog posts. Idempotent: re-running updates existing posts by
// slug (it never duplicates and never touches your other posts).
//
// Run once with:  npm run seed:blogs  (from apps/api)
//
// Body markup supported by the article renderer:
//   "## Heading"  -> section heading
//   "> Callout"   -> highlighted callout box
//   blank line    -> new paragraph

interface SeedPost {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  readTime: string;
  featuredImage: string;
  content: string;
}

const POSTS: SeedPost[] = [
  {
    title: 'What Is TruliCares? Trusted Care and Healthcare Staffing, Explained',
    slug: 'what-is-trulicares',
    featuredImage: '/blog/what-is-trulicares.jpg',
    category: 'About',
    tags: ['trulicares', 'about', 'care marketplace', 'healthcare staffing'],
    seoTitle: 'What Is TruliCares? Verified Caregivers & Healthcare Staffing',
    seoDescription:
      'TruliCares is a care marketplace that matches families with verified caregivers and connects healthcare facilities with licensed professionals. Here is how it works.',
    readTime: '5 min read',
    excerpt:
      'TruliCares is a two-sided care platform: families find verified caregivers for child, senior, and adult care, while facilities hire licensed nursing professionals for shifts.',
    content: `TruliCares is a modern care marketplace built around one idea: finding care you can truly trust should be simple, transparent, and safe. If you searched "TruliCares" and landed here, this is the official explainer of who we are and what we do.

> Quick note: TruliCares (care marketplace) is not affiliated with any pharmaceutical product with a similar-sounding name. We are a technology platform for finding caregivers and staffing healthcare shifts.

## Two experiences in one platform

TruliCares serves two audiences. For families, we make it easy to find and match with verified caregivers for child care, senior care, adult care, and home cleaning. For healthcare professionals and facilities, we run a staffing marketplace for licensed, shift-based work with escrow-protected payments.

That means whether you are a parent looking for a trusted nanny, an adult child arranging senior care, a nurse seeking flexible shifts, or a facility that needs to fill a gap fast, TruliCares is built for you.

## Why "verified" matters

Every caregiver profile is built around visible trust signals rather than hidden claims. Background-check status, identity verification, experience, specialties, and reviews are shown up front so you can make an informed decision. For staffing, professionals submit license and credential details that are verified before they can apply to shifts.

## How families get started

Families begin with a short guided questionnaire, submit a care request, review matched caregivers, and unlock messaging when they are ready to connect. Your dashboard keeps requests, matches, and schedules in one place.

## How professionals and facilities get started

Healthcare professionals create a profile, complete verification, and browse open shifts with fast wallet payouts. Facilities post shifts, review verified applicants, and confirm bookings with payments held safely in escrow until the shift is completed.

> Ready to begin? Families can start at the Find Care page, caregivers at Provide Care, and facilities at the For Facilities page.

## The bottom line

TruliCares exists to remove the guesswork from care. Verified people, transparent profiles, protected payments, and real human support — so families and healthcare teams can focus on what matters most.`,
  },
  {
    title: 'How to Find a Trusted, Verified Caregiver Near You',
    slug: 'how-to-find-a-trusted-caregiver',
    featuredImage: '/blog/find-a-caregiver.jpg',
    category: 'Finding Care',
    tags: ['find a caregiver', 'verified caregivers', 'hiring help', 'care tips'],
    seoTitle: 'How to Find a Trusted, Verified Caregiver Near You',
    seoDescription:
      'A practical, step-by-step guide to finding and vetting a trustworthy caregiver near you — what to check, what to ask, and red flags to avoid.',
    readTime: '6 min read',
    excerpt:
      'Hiring a caregiver is a big decision. Here is a clear, step-by-step way to find someone qualified, verified, and right for your family.',
    content: `Finding the right caregiver can feel overwhelming. The good news: a clear process makes it far less stressful. Here is how to find someone you can genuinely trust.

## 1. Get specific about your needs

Before you search, write down the essentials: the type of care (child, senior, adult, or cleaning), the schedule, must-have skills, and any special considerations like mobility help, medication reminders, or experience with a particular condition. The clearer your needs, the better your matches.

## 2. Prioritize verification, not just résumés

A polished profile is not the same as a verified one. Look for visible trust signals: identity verification, background-check status, confirmed experience, and genuine reviews from other families.

> On TruliCares, verification and background-check status are shown directly on each caregiver's profile, so you are not taking anyone's word for it.

## 3. Ask the right questions

In your first conversation, go beyond logistics. Ask how they would handle a specific scenario relevant to your situation, what their experience looks like day to day, and how they communicate with families. Listen for specifics, not generic answers.

## 4. Watch for red flags

Be cautious of anyone who avoids verification, pressures you to pay or communicate off-platform, or is vague about experience and references. Trustworthy caregivers welcome reasonable vetting.

## 5. Start with a trial and keep communicating

Begin with a short trial period and stay in close contact. Clear expectations early — schedule, responsibilities, and emergencies — set everyone up for success.

## Make it easier with the right platform

A good platform does the heavy lifting: verified profiles, secure messaging, and support if something is not the right fit. Start your search on the Find Care page and review matched, verified caregivers near you.`,
  },
  {
    title: 'In-Home Senior Care: A Complete Guide for Families',
    slug: 'in-home-senior-care-guide',
    featuredImage: '/blog/senior-care.jpg',
    category: 'Senior Care',
    tags: ['senior care', 'elderly care', 'in-home care', 'aging in place'],
    seoTitle: 'In-Home Senior Care: A Complete Guide for Families',
    seoDescription:
      'Everything families need to know about in-home senior care: types of care, costs to consider, how to choose a caregiver, and how to keep loved ones safe.',
    readTime: '7 min read',
    excerpt:
      'In-home senior care helps older adults stay safe and independent at home. Here is how to understand your options and choose the right support.',
    content: `Most older adults want to stay in their own homes as they age. In-home senior care makes that possible — with the right support, planning, and people.

## What in-home senior care includes

Senior care covers a wide range of support: companionship, help with daily living (bathing, dressing, meals), mobility assistance, medication reminders, transportation, and light housekeeping. Some seniors need a few hours a week; others need daily help.

## Signs it may be time for help

Watch for missed medications, unsteady movement, weight loss, isolation, or difficulty keeping up with the home. These are common signals that a little support could make a big difference in safety and quality of life.

> Starting the conversation early — before a crisis — gives your family time to choose thoughtfully rather than react under pressure.

## How to choose the right caregiver

Look for relevant experience (for example, with mobility or memory care), verified background checks, and a warm, patient communication style. A good match is as much about personality and trust as it is about skills.

## Planning for cost

Costs vary by location, hours, and level of care. Decide how many hours you realistically need, whether care is ongoing or short-term, and who will coordinate scheduling. Being clear on this up front prevents surprises.

## Keeping your loved one safe

Set clear routines, keep emergency contacts visible, and maintain open communication with the caregiver. Regular check-ins help you catch changes early and adjust care as needs evolve.

## Finding senior care you can trust

The hardest part is knowing the person in your loved one's home is genuinely qualified and verified. Browse verified senior caregivers on TruliCares and start with a care request that captures exactly what your family needs.`,
  },
  {
    title: 'Child Care Options Compared: Nanny vs Babysitter vs Daycare',
    slug: 'child-care-options-compared',
    featuredImage: '/blog/child-care.jpg',
    category: 'Child Care',
    tags: ['child care', 'nanny', 'babysitter', 'daycare', 'parenting'],
    seoTitle: 'Nanny vs Babysitter vs Daycare: Which Child Care Is Right?',
    seoDescription:
      'Compare nannies, babysitters, and daycare by cost, flexibility, and care style to choose the best child care option for your family.',
    readTime: '6 min read',
    excerpt:
      'Nanny, babysitter, or daycare? Each has trade-offs in cost, flexibility, and attention. Here is how to choose what fits your family.',
    content: `Choosing child care is one of the biggest decisions parents make. The "best" option depends on your schedule, budget, and what you want for your child. Here is a clear comparison.

## Nanny: consistent, personalized care

A nanny provides one-on-one care in your home, usually on a regular schedule. The big advantages are consistency, personalized attention, and flexibility around your routine. It is typically the most premium option and works well for families wanting dedicated, in-home care.

## Babysitter: flexible, occasional help

A babysitter is ideal for occasional or short-notice care — date nights, appointments, or busy afternoons. Babysitters offer flexibility without an ongoing commitment, making them a great supplement to other arrangements.

## Daycare: structure and socialization

Daycare centers offer structured days, socialization with other children, and predictable hours. They are often more affordable than a full-time nanny, though less flexible if your schedule changes or your child is sick.

> There is no universal best choice. Many families mix options — for example, daycare during the week plus a trusted babysitter for evenings.

## How to decide

Ask yourself: How many hours do I need? How important is one-on-one attention versus socialization? How flexible is my schedule? What is my budget? Your answers point clearly toward one option — or a combination.

## Whatever you choose, verify

No matter which path you take, prioritize verified, background-checked caregivers and clear communication. Browse verified child-care providers on TruliCares and post a request describing your family's schedule and needs.`,
  },
  {
    title: 'Per-Diem Nursing: How to Earn More with Flexible Shifts',
    slug: 'per-diem-nursing-earn-more',
    featuredImage: '/blog/per-diem-nursing.jpg',
    category: 'For Professionals',
    tags: ['per diem nursing', 'nursing shifts', 'healthcare jobs', 'flexible work'],
    seoTitle: 'Per-Diem Nursing: How to Earn More with Flexible Shifts',
    seoDescription:
      'A guide for nurses and healthcare professionals on per-diem work: how it works, how to earn more, and how to get fast, reliable payouts.',
    readTime: '6 min read',
    excerpt:
      'Per-diem and shift-based work lets healthcare professionals control their schedule and boost earnings. Here is how to make it work for you.',
    content: `Per-diem work is changing how healthcare professionals build their careers. Instead of being locked into a single employer, you choose where and when you work — often at premium rates.

## What per-diem work means

Per-diem ("as needed") nursing and allied-health work lets you pick up individual shifts at facilities that need coverage. You control your schedule, fill gaps that fit your life, and frequently earn more per hour than a fixed staff role.

## How to earn more

The professionals who earn the most tend to do a few things well: keep their credentials and verification current so they can apply instantly, maintain a strong reliability record, broaden the specialties and shift types they accept, and pick up higher-demand shifts.

> On TruliCares, completing verification and payout onboarding up front means you can apply to shifts immediately and get paid quickly after each one.

## Get verified once, apply fast

Before applying, submit your license, credentials, and identity for verification. This one-time step unlocks shift applications and signals to facilities that you are ready to work.

## Reliability is your reputation

Showing up on time, checking in and out properly, and communicating clearly builds a reliability score that facilities trust. Over time, that reputation leads to more and better shift offers.

## Fast, protected payouts

The best part of modern staffing is getting paid quickly and safely. Facility payments are held in escrow and released to your wallet after the shift is completed and approved — no chasing invoices.

## Start picking up shifts

If you are a nurse, aide, therapist, or allied-health professional, set up your profile on the For Professionals page, complete verification, and start browsing open shifts near you.`,
  },
  {
    title: 'How Facilities Fill Nursing Shifts Fast with Verified Professionals',
    slug: 'fill-nursing-shifts-fast',
    featuredImage: '/blog/facility-staffing.jpg',
    category: 'For Facilities',
    tags: ['healthcare staffing', 'nursing shifts', 'facilities', 'per diem staffing'],
    seoTitle: 'How Facilities Fill Nursing Shifts Fast with Verified Pros',
    seoDescription:
      'A guide for healthcare facilities on filling open nursing shifts quickly with verified, licensed professionals and escrow-protected payments.',
    readTime: '6 min read',
    excerpt:
      'Open shifts and short staffing strain your team. Here is how facilities fill nursing shifts fast with verified professionals and protected payments.',
    content: `Unfilled shifts mean overworked staff and stretched budgets. The solution is not just more applicants — it is fast access to verified, reliable professionals when you need them.

## Why traditional staffing is slow

Agency contracts, phone trees, and manual vetting take time you do not have when a shift opens tomorrow. By the time a role is filled, your team has already absorbed the strain.

## A faster model

Modern staffing marketplaces let you post a shift in minutes, instantly reach a pool of verified professionals, and review applicants whose licenses and credentials are already confirmed. You confirm a booking and the shift is covered — often the same day.

> Speed only helps if the people are qualified. Every professional on TruliCares completes verification before they can apply, so a fast fill is still a safe fill.

## What to look for in applicants

Review verification status, relevant specialties, experience, and reliability indicators like completed shifts and ratings. These signals help you choose confidently and quickly.

## Protected payments

With escrow-protected bookings, you fund the shift securely and payment is released to the professional only after the shift is completed. That protects your budget and gives professionals confidence they will be paid.

## Build a reliable bench

Over time, you can identify the professionals who fit your facility well and bring them back. A reliable bench of verified pros turns last-minute scrambles into a simple, repeatable process.

## Post your first shift

If your facility needs coverage, set up your profile on the For Facilities page, post an open shift, and start reviewing verified applicants today.`,
  },
];

async function seedBlogs() {
  console.log('🌱 Seeding SEO blog posts...');
  let created = 0;
  let updated = 0;

  for (const p of POSTS) {
    const res = await pool.query(
      `INSERT INTO blog_posts
         (title, slug, excerpt, content, featured_image, category, tags, seo_title, seo_description,
          author_name, read_time, status, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'published', NOW())
       ON CONFLICT (slug) DO UPDATE SET
         title = EXCLUDED.title,
         excerpt = EXCLUDED.excerpt,
         content = EXCLUDED.content,
         featured_image = EXCLUDED.featured_image,
         category = EXCLUDED.category,
         tags = EXCLUDED.tags,
         seo_title = EXCLUDED.seo_title,
         seo_description = EXCLUDED.seo_description,
         author_name = EXCLUDED.author_name,
         read_time = EXCLUDED.read_time,
         status = 'published',
         published_at = COALESCE(blog_posts.published_at, NOW()),
         updated_at = NOW()
       RETURNING (xmax = 0) AS inserted`,
      [
        p.title, p.slug, p.excerpt, p.content, p.featuredImage, p.category, p.tags,
        p.seoTitle, p.seoDescription, 'TruliCares Team', p.readTime,
      ]
    );
    if (res.rows[0]?.inserted) created++;
    else updated++;
    console.log(`  ✓ ${p.slug}`);
  }

  console.log(`\n✓ Done. ${created} created, ${updated} updated. Total posts seeded: ${POSTS.length}.`);
  await pool.end();
}

seedBlogs().catch((err) => {
  console.error('Blog seed failed:', err);
  process.exit(1);
});
