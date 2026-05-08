import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, User, Share2, Bookmark, ChevronRight } from 'lucide-react';

import imgNannyInterview from '@/assets/blog-nanny-interview.jpg';
import imgSeniorSigns from '@/assets/blog-senior-signs.jpg';
import imgChildTransition from '@/assets/blog-child-transition.jpg';
import imgSpringCleaning from '@/assets/blog-spring-cleaning.jpg';

const articles = [
  {
    id: 1,
    category: 'Child Care',
    title: '10 Questions to Ask When Hiring a Nanny',
    excerpt: 'Finding the right nanny is crucial. Here are the essential questions every parent should ask during the interview process to ensure a safe and nurturing fit.',
    readTime: '5 min read',
    author: 'Sarah Mitchell',
    date: 'April 15, 2026',
    type: 'article',
    image: imgNannyInterview,
    content: [
      {
        type: 'intro',
        text: 'Hiring a nanny is one of the most important decisions a parent can make. You are entrusting someone with your child\'s safety, development, and wellbeing. Going into interviews prepared can make the difference between a great match and months of frustration.',
      },
      {
        type: 'heading',
        text: '1. What is your experience with children the same age as mine?',
      },
      {
        type: 'paragraph',
        text: 'Experience with infants is vastly different from experience with school-age children. Make sure the candidate has relevant, hands-on experience that matches your child\'s current stage. Ask for specific examples of activities they engaged in and challenges they navigated.',
      },
      {
        type: 'heading',
        text: '2. Are you CPR and first aid certified?',
      },
      {
        type: 'paragraph',
        text: 'This is non-negotiable for most families. A certified nanny knows how to respond in medical emergencies — from choking to allergic reactions. Ask when the certification was obtained and whether they\'re willing to renew it if it has lapsed.',
      },
      {
        type: 'heading',
        text: '3. What does a typical day look like for you?',
      },
      {
        type: 'paragraph',
        text: 'This open-ended question reveals a candidate\'s approach to structure, play, and education. A great nanny will describe a balance of routine, outdoor time, creative play, and developmentally appropriate activities — not just TV and screens.',
      },
      {
        type: 'heading',
        text: '4. How do you handle discipline?',
      },
      {
        type: 'paragraph',
        text: 'Alignment on discipline philosophy is critical. Whether your family uses time-outs, redirection, or positive reinforcement, your nanny needs to be on the same page. Listen for red flags like describing punishment methods you\'re uncomfortable with.',
      },
      {
        type: 'heading',
        text: '5. Can you describe a challenging situation and how you handled it?',
      },
      {
        type: 'paragraph',
        text: 'This behavioral interview question reveals problem-solving ability, composure under pressure, and communication skills. Look for candidates who stayed calm, communicated with the parents, and prioritized the child\'s safety and wellbeing.',
      },
      {
        type: 'heading',
        text: '6. Are you comfortable with our household expectations?',
      },
      {
        type: 'paragraph',
        text: 'Be specific about light housekeeping, meal prep, pickup from school, or driving. Misaligned expectations about duties are one of the leading causes of nanny relationships breaking down. Put everything in writing in a nanny contract.',
      },
      {
        type: 'heading',
        text: '7. What are your plans for the next 1–3 years?',
      },
      {
        type: 'paragraph',
        text: 'Stability matters. If a nanny plans to move, go back to school, or transition careers, you want to know upfront. This helps you plan for potential transitions and avoid being left without care unexpectedly.',
      },
      {
        type: 'heading',
        text: '8. Are you comfortable with pets?',
      },
      {
        type: 'paragraph',
        text: 'If you have dogs, cats, or other animals at home, allergies or fears can be a dealbreaker. Ask specifically about experience and comfort level with your type of pet.',
      },
      {
        type: 'heading',
        text: '9. Can you provide three references?',
      },
      {
        type: 'paragraph',
        text: 'Always call references — don\'t just collect them. Ask references about reliability, relationship with children, communication style, and whether they would hire the person again. A glowing reference from a family is one of the strongest signals of a great candidate.',
      },
      {
        type: 'heading',
        text: '10. What are your salary expectations and availability?',
      },
      {
        type: 'paragraph',
        text: 'Be transparent about your budget and schedule early to avoid wasting time. Discuss overtime rates, sick days, vacation pay, and any guaranteed hours. A professional nanny will appreciate the clarity.',
      },
      {
        type: 'callout',
        text: 'Tip: Always conduct a paid trial day before making a final hiring decision. It lets you observe the nanny with your children in your own home — and gives the nanny a chance to see if it\'s the right fit for them too.',
      },
    ],
  },
  {
    id: 2,
    category: 'Senior Care',
    title: 'Signs Your Aging Parent May Need Additional Care',
    excerpt: 'Recognizing when a parent needs help can be challenging. Learn the early warning signs — from missed medications to social withdrawal — so you can act with confidence.',
    readTime: '7 min read',
    author: 'Dr. James Chen',
    date: 'April 22, 2026',
    type: 'article',
    image: imgSeniorSigns,
    content: [
      {
        type: 'intro',
        text: 'Recognizing that a parent needs more support is one of the hardest realizations for adult children. The changes often happen gradually, making them easy to dismiss — until a crisis occurs. Knowing what to look for allows you to act proactively rather than reactively.',
      },
      {
        type: 'heading',
        text: 'Physical Warning Signs',
      },
      {
        type: 'paragraph',
        text: 'Unexplained weight loss, frequent falls, or a decline in personal hygiene are among the clearest physical signals. If your parent\'s home has a noticeable odor, dishes piling up, or expired food in the refrigerator, these suggest difficulty managing daily tasks.',
      },
      {
        type: 'heading',
        text: 'Medication Mismanagement',
      },
      {
        type: 'paragraph',
        text: 'Missed doses, double-dosing, or confusion about which medications to take when can have serious health consequences. If you find pill bottles cluttered together without order, or a parent who can\'t reliably describe their medication regimen, a caregiver or medication management system may be needed.',
      },
      {
        type: 'heading',
        text: 'Cognitive and Memory Changes',
      },
      {
        type: 'paragraph',
        text: 'Occasional forgetfulness is normal aging. But getting lost on familiar routes, repeatedly asking the same questions within a short time frame, or confusion about dates and seasons are signs worth discussing with a physician. Early assessment can open the door to treatments that slow decline.',
      },
      {
        type: 'heading',
        text: 'Social Withdrawal',
      },
      {
        type: 'paragraph',
        text: 'If a once-social parent stops attending church, community events, or family gatherings — or if phone calls become infrequent — loneliness or depression may be at play. Social isolation is strongly linked to accelerated cognitive decline in seniors.',
      },
      {
        type: 'heading',
        text: 'Financial Concerns',
      },
      {
        type: 'paragraph',
        text: 'Unpaid bills, unusual bank withdrawals, or vulnerability to scams may signal cognitive changes affecting judgment. Gently reviewing finances with your parent — framed as a shared responsibility — can help catch problems early.',
      },
      {
        type: 'callout',
        text: 'Starting the conversation: Instead of "I\'m worried about you," try "I want to make sure we\'re planning together so you stay as independent as possible." This reframes the discussion as collaborative rather than threatening autonomy.',
      },
      {
        type: 'heading',
        text: 'What to Do Next',
      },
      {
        type: 'paragraph',
        text: 'Schedule a conversation — not a confrontation. Include siblings or trusted family members if possible, and consider involving your parent\'s physician. Explore a range of options, from in-home companion care a few days a week to more comprehensive personal care, before assuming a major transition is necessary.',
      },
    ],
  },
  {
    id: 3,
    category: 'Child Care',
    title: 'How to Prepare Your Child for a New Caregiver',
    excerpt: 'Transitioning to a new caregiver can be tough for kids. Follow these child-psychologist-approved tips to build trust and make it smoother for everyone.',
    readTime: '4 min read',
    author: 'Emma Davis',
    date: 'May 1, 2026',
    type: 'guide',
    image: imgChildTransition,
    content: [
      {
        type: 'intro',
        text: 'Change is hard for children at every age — but a new caregiver doesn\'t have to be disruptive. With the right preparation, you can help your child build a positive relationship with their new caregiver from day one.',
      },
      {
        type: 'heading',
        text: 'Talk about it before it happens',
      },
      {
        type: 'paragraph',
        text: 'Children do better with change when they feel informed and included. Use simple, age-appropriate language: "A helper named Maria is going to come take care of you on Tuesdays. She loves playing at parks just like you do." Framing it positively and specifically helps reduce anxiety.',
      },
      {
        type: 'heading',
        text: 'Arrange a meet-and-greet',
      },
      {
        type: 'paragraph',
        text: 'Before the first official caregiving day, arrange a short visit — ideally while you\'re still home — so your child can meet the caregiver in a safe context. Let the child set the pace for interaction. Don\'t force hugs or greetings.',
      },
      {
        type: 'heading',
        text: 'Share your child\'s favorites',
      },
      {
        type: 'paragraph',
        text: 'Give your new caregiver a "cheat sheet" — favorite snacks, comfort objects, nap preferences, the songs that help them settle. A caregiver who knows that your son loves dinosaurs and always needs his blue blanket will connect much faster.',
      },
      {
        type: 'heading',
        text: 'Create a goodbye ritual',
      },
      {
        type: 'paragraph',
        text: 'Consistent goodbye rituals help toddlers and preschoolers manage transitions. A special handshake, three kisses, or a wave from the window signals that departures are safe and temporary. Never sneak away — even if it feels easier in the moment, it erodes trust.',
      },
      {
        type: 'callout',
        text: 'Remember: Some adjustment period is completely normal. Most children warm up to new caregivers within 2–4 weeks. If significant distress continues beyond a month, consult your pediatrician.',
      },
      {
        type: 'heading',
        text: 'Check in — but don\'t hover',
      },
      {
        type: 'paragraph',
        text: 'Ask your child open-ended questions at the end of the day: "What\'s something fun you did today?" rather than "Did you like Maria?" Young children respond better to specific prompts than yes/no questions. And give the caregiver space to build their own relationship — constant check-ins can undermine both their confidence and your child\'s adjustment.',
      },
    ],
  },
  {
    id: 4,
    category: 'Cleaning',
    title: 'Spring Cleaning Checklist: Room by Room',
    excerpt: 'A comprehensive, expert-backed guide to deep cleaning your home — with printable checklists and pro tips for every room from kitchen to bathroom.',
    readTime: '8 min read',
    author: 'Lisa Thompson',
    date: 'March 20, 2026',
    type: 'guide',
    image: imgSpringCleaning,
    content: [
      {
        type: 'intro',
        text: 'Spring cleaning isn\'t just about aesthetics — it\'s about resetting your home environment after winter, reducing allergens, and creating space for a fresh start. Working room by room prevents overwhelm and ensures nothing gets missed.',
      },
      {
        type: 'heading',
        text: 'Kitchen',
      },
      {
        type: 'paragraph',
        text: 'The kitchen deserves the most attention. Clean inside the oven and microwave, wipe down cabinet fronts, and empty the refrigerator completely to wipe down all shelves and drawers. Descale the coffee maker, clean the dishwasher filter, and pull out the refrigerator to vacuum the coils. Organize the pantry and discard expired items.',
      },
      {
        type: 'heading',
        text: 'Bathrooms',
      },
      {
        type: 'paragraph',
        text: 'Scrub grout lines with a baking soda paste and an old toothbrush. Remove and wash the shower curtain liner. Clean the exhaust fan (a common allergen collector), check caulking around the tub and re-caulk if needed, and descale faucets and showerheads with white vinegar.',
      },
      {
        type: 'heading',
        text: 'Bedrooms',
      },
      {
        type: 'paragraph',
        text: 'Wash all bedding including mattress covers. Flip or rotate the mattress. Vacuum the mattress surface. Clean under the bed and inside closets — donate anything you haven\'t worn in a year. Wipe down baseboards, window sills, and ceiling fans.',
      },
      {
        type: 'heading',
        text: 'Living Areas',
      },
      {
        type: 'paragraph',
        text: 'Move furniture to vacuum underneath. Wash throw pillows and blankets. Clean window treatments — curtains can be machine-washed; blinds can be wiped down slat by slat. Wipe down all light switches, remote controls, and door handles.',
      },
      {
        type: 'callout',
        text: 'Pro tip: Work top to bottom in every room — ceiling fans, then shelves, then counters, then floors. This way dust falls down and gets cleaned up last, rather than re-dirtying surfaces you\'ve already cleaned.',
      },
      {
        type: 'heading',
        text: 'Outdoor Spaces',
      },
      {
        type: 'paragraph',
        text: 'Power wash the deck or patio. Clean outdoor furniture and bring out cushions from storage. Check gutters and clean out any winter debris. This is also a good time to check window screens for holes and replace them before summer.',
      },
    ],
  },
  {
    id: 5,
    category: 'Adult Care',
    title: 'Understanding Behavioral Support Services',
    excerpt: 'What to know about behavioral health services and how to find the right provider for your loved one. A clear guide for families navigating adult care.',
    readTime: '6 min read',
    author: 'Dr. Maria Santos',
    date: 'April 8, 2026',
    type: 'article',
    image: null,
    gradient: 'from-sky-400 to-blue-600',
    content: [
      {
        type: 'intro',
        text: 'Behavioral support services help adults with developmental disabilities, autism spectrum disorder, acquired brain injuries, and similar conditions live more independently and participate meaningfully in community life. Understanding the landscape helps families make informed choices.',
      },
      {
        type: 'heading',
        text: 'What behavioral support looks like',
      },
      {
        type: 'paragraph',
        text: 'Behavioral support can range from a few hours of community support per week to intensive residential care. Common services include supported employment, community integration, life skills training, and crisis prevention planning. The goal is always to build on the individual\'s strengths rather than simply managing behavior.',
      },
      {
        type: 'heading',
        text: 'Finding the right match',
      },
      {
        type: 'paragraph',
        text: 'Look for caregivers with specific training in positive behavior support (PBS) — a research-backed approach that focuses on understanding the function of behavior rather than eliminating it through punishment. Ask about their experience with your loved one\'s specific diagnosis and whether they\'re trained in de-escalation techniques.',
      },
      {
        type: 'heading',
        text: 'Involving the person receiving care',
      },
      {
        type: 'paragraph',
        text: 'Adults receiving behavioral support have the right to participate in planning their own care whenever possible. Person-centered planning — where goals and supports are built around what matters to the individual — leads to better outcomes and greater dignity.',
      },
      {
        type: 'callout',
        text: 'Important: Medicaid waivers in many states fund behavioral support services. Contact your state\'s developmental disabilities agency to understand eligibility — many families are unaware of funding they qualify for.',
      },
      {
        type: 'heading',
        text: 'Red flags to watch for',
      },
      {
        type: 'paragraph',
        text: 'Trust your instincts if something feels off. Signs of poor quality behavioral support include: using restrictive practices without documented justification, failing to involve the person in their own plan, high staff turnover, and resistance to family involvement. Quality providers welcome family engagement as a core part of care.',
      },
    ],
  },
  {
    id: 6,
    category: 'Senior Care',
    title: 'Creating a Safe Home Environment for Seniors',
    excerpt: 'An expert guide on home modifications that can help prevent falls, improve accessibility, and keep aging loved ones safe and comfortable at home.',
    readTime: '10 min read',
    author: 'TruliCares Team',
    date: 'March 5, 2026',
    type: 'guide',
    image: null,
    gradient: 'from-brand-400 to-brand-700',
    content: [
      {
        type: 'intro',
        text: 'Falls are the leading cause of injury-related death among adults 65 and older in the United States. Most falls happen at home — and most are preventable. A thoughtful home safety assessment can dramatically reduce risk and extend independence.',
      },
      {
        type: 'heading',
        text: 'Bathroom: the highest-risk room',
      },
      {
        type: 'paragraph',
        text: 'Install grab bars next to the toilet and inside the shower — not towel bars, which are not weight-bearing. Use a non-slip bath mat and a shower chair. Consider a handheld showerhead for easier bathing. Raise the toilet seat if needed. Ensure adequate lighting, especially at night.',
      },
      {
        type: 'heading',
        text: 'Flooring and pathways',
      },
      {
        type: 'paragraph',
        text: 'Remove or secure all throw rugs, which are a leading fall hazard. Ensure all carpeting is tacked down at edges. Keep pathways clear — especially the route from the bedroom to the bathroom, which is often traveled in the dark. Consider nightlights in hallways and bathrooms.',
      },
      {
        type: 'heading',
        text: 'Stairways',
      },
      {
        type: 'paragraph',
        text: 'Install handrails on both sides of every staircase. Ensure stairs are well-lit with switches at both top and bottom. Apply non-slip treads to each step. If your loved one has significant mobility challenges, evaluate whether a stair lift is appropriate.',
      },
      {
        type: 'heading',
        text: 'Kitchen safety',
      },
      {
        type: 'paragraph',
        text: 'Store frequently used items between shoulder and knee height to avoid reaching and bending. Use an induction cooktop to reduce fire risk. Consider automatic shut-off devices for the stove. Ensure the floor stays dry and consider an anti-fatigue mat near the sink.',
      },
      {
        type: 'callout',
        text: 'Many Area Agencies on Aging (AAA) offer free or low-cost home safety assessments. An occupational therapist can identify specific modifications tailored to your loved one\'s mobility and cognitive abilities.',
      },
      {
        type: 'heading',
        text: 'Technology and monitoring',
      },
      {
        type: 'paragraph',
        text: 'Personal emergency response systems (PERS) — wearable devices with a button to call for help — are among the most effective safety tools. Newer systems include fall detection that automatically alerts emergency contacts. Smart home technology like voice-controlled lights and thermostats can also reduce the need for risky movements.',
      },
    ],
  },
];

const relatedPairs: Record<number, number[]> = {
  1: [3, 2], 2: [6, 1], 3: [1, 2], 4: [5, 6], 5: [2, 6], 6: [2, 5],
};

export default function ResourceArticle() {
  const { id } = useParams<{ id: string }>();
  const article = articles.find(a => a.id === Number(id));

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 mb-2">Article not found</p>
          <Link to="/resources" className="text-brand-600 hover:underline font-medium">← Back to Resources</Link>
        </div>
      </div>
    );
  }

  const related = (relatedPairs[article.id] || []).map(rid => articles.find(a => a.id === rid)).filter(Boolean);

  return (
    <div className="bg-white">
      {/* Hero */}
      <div className="relative">
        {article.image ? (
          <div className="h-72 sm:h-96 overflow-hidden">
            <img src={article.image} alt={article.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </div>
        ) : (
          <div className={`h-72 sm:h-96 bg-gradient-to-br ${(article as any).gradient || 'from-brand-500 to-brand-700'} relative`}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-8 max-w-3xl mx-auto">
          <span className="inline-block px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-bold text-gray-800 mb-3">
            {article.category}
          </span>
          <h1 className="text-2xl sm:text-4xl font-bold text-white leading-tight">{article.title}</h1>
        </div>
      </div>

      {/* Breadcrumb + meta */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
          <Link to="/resources" className="hover:text-brand-600 transition-colors">Resources</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-600 font-medium truncate">{article.title}</span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-brand-600" />
              </div>
              {article.author}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> {article.readTime}
            </span>
            <span className="text-gray-400">{article.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full border border-gray-200 hover:border-brand-300 flex items-center justify-center transition-colors text-gray-500 hover:text-brand-600">
              <Bookmark className="w-4 h-4" />
            </button>
            <button className="w-9 h-9 rounded-full border border-gray-200 hover:border-brand-300 flex items-center justify-center transition-colors text-gray-500 hover:text-brand-600">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Article body */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="space-y-6">
          {article.content.map((block, i) => {
            if (block.type === 'intro') {
              return (
                <p key={i} className="text-lg text-gray-700 leading-relaxed font-medium border-l-4 border-brand-400 pl-5 py-1">
                  {block.text}
                </p>
              );
            }
            if (block.type === 'heading') {
              return (
                <h2 key={i} className="text-xl font-bold text-gray-900 mt-8 first:mt-0">
                  {block.text}
                </h2>
              );
            }
            if (block.type === 'paragraph') {
              return (
                <p key={i} className="text-base text-gray-600 leading-relaxed">
                  {block.text}
                </p>
              );
            }
            if (block.type === 'callout') {
              return (
                <div key={i} className="bg-brand-50 border border-brand-100 rounded-2xl p-5">
                  <p className="text-sm text-brand-800 leading-relaxed">{block.text}</p>
                </div>
              );
            }
            return null;
          })}
        </div>

        {/* CTA */}
        <div className="mt-14 bg-gradient-to-br from-brand-900 to-brand-950 rounded-3xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-2">Ready to find trusted care?</h3>
          <p className="text-brand-200 mb-6 text-sm">Connect with verified caregivers near you in minutes.</p>
          <Link
            to="/find-care"
            className="inline-block px-8 py-3 bg-coral-500 hover:bg-coral-600 text-white font-bold rounded-2xl transition-colors shadow-lg"
          >
            Find a Caregiver
          </Link>
        </div>
      </div>

      {/* Related articles */}
      {related.length > 0 && (
        <div className="bg-gray-50 py-14">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">You might also like</h3>
            <div className="grid sm:grid-cols-2 gap-5">
              {related.map(rel => rel && (
                <Link
                  key={rel.id}
                  to={`/resources/${rel.id}`}
                  className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-transparent transition-all duration-300"
                >
                  <div className="h-36 overflow-hidden">
                    {rel.image ? (
                      <img src={rel.image} alt={rel.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${(rel as any).gradient || 'from-gray-400 to-gray-600'}`} />
                    )}
                  </div>
                  <div className="p-4">
                    <span className="text-xs font-bold text-brand-600">{rel.category}</span>
                    <h4 className="font-bold text-gray-900 text-sm mt-1 group-hover:text-brand-600 transition-colors leading-snug">{rel.title}</h4>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {rel.readTime}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link to="/resources" className="inline-flex items-center gap-2 text-brand-600 font-semibold hover:underline text-sm">
                <ArrowLeft className="w-4 h-4" /> View all resources
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
