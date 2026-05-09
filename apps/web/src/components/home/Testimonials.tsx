import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';
import { testimonials } from '@/data/mock';
import { cn } from '@/utils/cn';

const avatarColors = ['bg-coral-400', 'bg-brand-500', 'bg-sky-500', 'bg-warm-500'];

function TestimonialCard({ index, className }: { index: number; className?: string }) {
  const wrappedIndex = ((index % testimonials.length) + testimonials.length) % testimonials.length;
  const t = testimonials[wrappedIndex];
  return (
    <div className={cn(
      'bg-white rounded-3xl shadow-lg shadow-gray-200/40 border border-gray-100 p-6 lg:p-8 flex flex-col h-full',
      className
    )}>
      <Quote className="w-9 h-9 text-brand-100 mb-4 shrink-0" />

      <p className="text-base text-gray-700 leading-relaxed mb-6 italic font-serif flex-1">
        &ldquo;{t.text}&rdquo;
      </p>

      <div className="flex items-center gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={cn(
              'w-4 h-4',
              i < t.rating ? 'text-warm-400 fill-warm-400' : 'text-gray-200'
            )}
          />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className={cn(
          'w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0',
          avatarColors[wrappedIndex % avatarColors.length]
        )}>
          {t.avatarInitials}
        </div>
        <div>
          <h4 className="font-bold text-gray-900 text-sm">{t.name}</h4>
          <p className="text-xs text-gray-500">{t.role}</p>
        </div>
      </div>
    </div>
  );
}

export default function Testimonials() {
  const [current, setCurrent] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const total = testimonials.length;

  const next = useCallback(() => setCurrent(prev => (prev + 1) % total), [total]);
  const prev = useCallback(() => setCurrent(prev => (prev - 1 + total) % total), [total]);

  // Auto-advance on mobile
  useEffect(() => {
    if (isDesktop) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [isDesktop, next]);

  // On desktop show 3 cards starting from `current`, wrapping around
  // On mobile show 1 card at `current`
  const getVisibleIndices = (): number[] => {
    if (isDesktop) {
      return [current, (current + 1) % total, (current + 2) % total];
    }
    return [current];
  };

  const visibleIndices = getVisibleIndices();

  return (
    <section className="py-20 lg:py-28 bg-gradient-to-b from-white via-warm-50/30 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full bg-warm-100 text-warm-700 text-sm font-semibold mb-4">
            Testimonials
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            What Our{' '}
            <span className="bg-gradient-to-r from-warm-600 to-coral-500 bg-clip-text text-transparent">
              Community Says
            </span>
          </h2>
        </div>

        {/* Cards grid */}
        <div className="relative">
          <div
            key={current}
            className={cn(
              'grid gap-6 animate-fade-in-up',
              isDesktop ? 'grid-cols-3' : 'grid-cols-1 max-w-lg mx-auto'
            )}
            style={{ animationDuration: '0.35s' }}
          >
            {visibleIndices.map((idx) => (
              <TestimonialCard key={`${current}-${idx}`} index={idx} />
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4 mt-10">
          <button
            onClick={prev}
            className="w-11 h-11 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center hover:border-brand-400 hover:bg-brand-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  'transition-all duration-300 rounded-full',
                  i === current
                    ? 'w-8 h-3 bg-brand-500'
                    : 'w-3 h-3 bg-gray-300 hover:bg-gray-400'
                )}
              />
            ))}
          </div>

          <button
            onClick={next}
            className="w-11 h-11 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center hover:border-brand-400 hover:bg-brand-50 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
    </section>
  );
}
