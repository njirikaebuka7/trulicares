import { HelpCircle, ChevronRight, Clock, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { resources as resourcesApi } from '@/lib/api';

import imgNannyInterview from '@/assets/blog-nanny-interview.jpg';
import imgSeniorSigns from '@/assets/blog-senior-signs.jpg';
import imgChildTransition from '@/assets/blog-child-transition.jpg';
import imgSpringCleaning from '@/assets/blog-spring-cleaning.jpg';

const categories = ['All', 'Child Care', 'Senior Care', 'Adult Care', 'Cleaning'];

const articles = [
  {
    id: 1,
    category: 'Child Care',
    title: '10 Questions to Ask When Hiring a Nanny',
    excerpt: 'Finding the right nanny is crucial. Here are the essential questions every parent should ask during the interview process to ensure a safe and nurturing fit.',
    readTime: '5 min read',
    author: 'Femi Oloyede',
    type: 'article',
    image: imgNannyInterview,
  },
  {
    id: 2,
    category: 'Senior Care',
    title: 'Signs Your Aging Parent May Need Additional Care',
    excerpt: 'Recognizing when a parent needs help can be challenging. Learn the early warning signs — from missed medications to social withdrawal — so you can act with confidence.',
    readTime: '7 min read',
    author: 'Dr. James Chen',
    type: 'article',
    image: imgSeniorSigns,
  },
  {
    id: 3,
    category: 'Child Care',
    title: 'How to Prepare Your Child for a New Caregiver',
    excerpt: 'Transitioning to a new caregiver can be tough for kids. Follow these child-psychologist-approved tips to build trust and make it smoother for everyone.',
    readTime: '4 min read',
    author: 'Emma Davis',
    type: 'guide',
    image: imgChildTransition,
  },
  {
    id: 4,
    category: 'Cleaning',
    title: 'Spring Cleaning Checklist: Room by Room',
    excerpt: 'A comprehensive, expert-backed guide to deep cleaning your home — with printable checklists and pro tips for every room from kitchen to bathroom.',
    readTime: '8 min read',
    author: 'Lisa Thompson',
    type: 'guide',
    image: imgSpringCleaning,
  },
  {
    id: 5,
    category: 'Adult Care',
    title: 'Understanding Behavioral Support Services',
    excerpt: 'What to know about behavioral health services and how to find the right provider for your loved one. A clear guide for families navigating adult care.',
    readTime: '6 min read',
    author: 'Dr. Maria Santos',
    type: 'article',
    image: null,
  },
  {
    id: 6,
    category: 'Senior Care',
    title: 'Creating a Safe Home Environment for Seniors',
    excerpt: 'An expert guide on home modifications that can help prevent falls, improve accessibility, and keep aging loved ones safe and comfortable at home.',
    readTime: '10 min read',
    author: 'TruliCares Team',
    type: 'guide',
    image: null,
  },
];

const faqs = [
  {
    q: 'How does TruliCares verify caregivers?',
    a: 'All caregivers undergo email verification and identity verification before they can receive matches. Optional background checks are available and clearly indicated with a badge on caregiver profiles.',
  },
  {
    q: 'When do I pay for care services?',
    a: 'You only pay a small match-unlock fee ($9.99) when a caregiver accepts your request and you want to message them. Caregiver wages are paid directly to them — TruliCares never holds caregiver earnings.',
  },
  {
    q: 'Can I interview caregivers before hiring?',
    a: 'Absolutely! Once messaging is unlocked, you can schedule phone calls, video chats, or in-person interviews before making any commitments. We encourage families to take their time finding the right fit.',
  },
  {
    q: 'What if a match doesn\'t work out?',
    a: 'If your first match isn\'t the right fit, our system will automatically rematch you with other available caregivers in your area. You can also submit a new care request at any time.',
  },
  {
    q: 'Is it really free for caregivers to join?',
    a: 'Yes — caregivers register, create profiles, and receive matches completely free. Optional paid features include background check badges and profile boosts for increased visibility.',
  },
  {
    q: 'What care categories does TruliCares support?',
    a: 'We currently support four categories: Child Care (nannies, babysitters, daycare), Senior Care (companions, personal care, live-in), Adult Care (personal, behavioral, community support), and Cleaning Services (standard, deep clean, move-in/out).',
  },
];

// Gradient placeholders for articles without images
const placeholderGradients: Record<string, string> = {
  'Adult Care': 'from-sky-400 to-blue-600',
  'Senior Care': 'from-brand-400 to-brand-700',
};

export default function Resources() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [cmsPosts, setCmsPosts] = useState<any[]>([]);

  // Pull published CMS posts and show them ahead of the built-in starter articles.
  useEffect(() => {
    resourcesApi.list().then((d: any) => {
      setCmsPosts((d.posts || []).map((p: any) => ({
        id: p.slug,
        category: p.category || 'All',
        title: p.title,
        excerpt: p.excerpt || '',
        readTime: p.read_time || '',
        author: p.author_name || 'TruliCares',
        type: 'article',
        image: p.featured_image || '',
      })));
    }).catch(() => {});
  }, []);

  const allArticles = [...cmsPosts, ...articles];
  const filteredArticles = activeCategory === 'All'
    ? allArticles
    : allArticles.filter(a => a.category === activeCategory);

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 py-20 lg:py-28 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-10 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-coral-500/8 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full glass text-brand-200 text-sm font-semibold mb-6">
            Resources
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Care knowledge &{' '}
            <span className="bg-gradient-to-r from-brand-300 to-coral-400 bg-clip-text text-transparent">insights</span>
          </h1>
          <p className="text-lg text-brand-200 max-w-2xl mx-auto leading-relaxed">
            Expert articles, practical guides, and answers to help you make informed care decisions for your family.
          </p>
        </div>
      </section>

      {/* Category filter */}
      <section className="py-6 border-b border-gray-100 sticky top-16 lg:top-[72px] bg-white/95 backdrop-blur-lg z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                  activeCategory === cat
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Articles */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map(article => (
              <Link
                key={article.id}
                to={`/resources/${article.id}`}
                className="group bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-xl hover:border-transparent transition-all duration-300 block"
              >
                {/* Thumbnail */}
                <div className="relative h-48 overflow-hidden">
                  {article.image ? (
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className={cn(
                      'w-full h-full bg-gradient-to-br flex items-center justify-center',
                      placeholderGradients[article.category] || 'from-gray-400 to-gray-600'
                    )}>
                      <span className="text-5xl opacity-40">
                        {article.category === 'Adult Care' ? '🧑' : article.category === 'Senior Care' ? '❤️' : '📝'}
                      </span>
                    </div>
                  )}
                  {/* Category badge */}
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-bold text-gray-800 shadow-sm">
                      {article.category}
                    </span>
                  </div>
                  {/* Type badge */}
                  <div className="absolute top-3 right-3">
                    <span className={cn(
                      'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                      article.type === 'guide' ? 'bg-brand-500 text-white' : article.type === 'video' ? 'bg-coral-500 text-white' : 'bg-white/90 text-gray-700'
                    )}>
                      {article.type}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-brand-600 transition-colors leading-snug">
                    {article.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{article.excerpt}</p>
                  <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {article.readTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> {article.author}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 bg-gradient-to-b from-white via-brand-50/20 to-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-100 text-brand-700 text-sm font-semibold mb-4">
              <HelpCircle className="w-4 h-4" /> FAQs
            </span>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h2>
            <p className="text-gray-500">Quick answers to the most common questions about TruliCares.</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-semibold text-gray-900 pr-4">{faq.q}</span>
                  <ChevronRight className={cn(
                    'w-5 h-5 text-gray-400 transition-transform shrink-0',
                    openFaq === i && 'rotate-90'
                  )} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed animate-fade-in-up" style={{ animationDuration: '0.2s' }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
