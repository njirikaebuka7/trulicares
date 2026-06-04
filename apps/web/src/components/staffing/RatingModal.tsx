import { useState } from 'react';
import { Star, Loader2, X } from 'lucide-react';
import { toast } from '@/components/ui/Toaster';
import { ratings as ratingsApi } from '@/lib/staffingApi';

interface Props {
  bookingId: string;
  /** Who you're rating, for the heading copy. */
  rateeLabel: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

/** Two-way rating modal — 1-5 stars + optional comment, shown after a completed shift. */
export default function RatingModal({ bookingId, rateeLabel, onClose, onSubmitted }: Props) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (stars < 1) { toast('Please select a star rating', 'error'); return; }
    setSaving(true);
    try {
      await ratingsApi.submit(bookingId, stars, comment.trim() || undefined);
      toast('Thanks for your feedback!');
      onSubmitted?.();
      onClose();
    } catch (err: any) {
      toast(err.message || 'Failed to submit rating', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !saving && onClose()} />
      <div className="relative bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
          <X className="w-4 h-4" />
        </button>
        <h3 className="text-xl font-bold text-gray-900 mb-1">Rate {rateeLabel}</h3>
        <p className="text-sm text-gray-500 mb-5">Your feedback helps keep the community trusted.</p>

        <div className="flex items-center justify-center gap-2 mb-5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setStars(n)}
              className="transition-transform active:scale-90"
            >
              <Star className={`w-9 h-9 ${(hover || stars) >= n ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Add a comment (optional)…"
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent rounded-2xl text-sm outline-none resize-none mb-5"
        />

        <button
          onClick={submit}
          disabled={saving}
          className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-full hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Rating'}
        </button>
      </div>
    </div>
  );
}
