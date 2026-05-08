import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import logoImg from '@/assets/logo.png';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-coral-50 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <img src={logoImg} alt="TruliCares" className="h-10 w-auto mx-auto mb-8 opacity-60" />
          <div className="text-8xl font-black text-brand-200 mb-2 leading-none">404</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Page not found</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            The page you're looking for doesn't exist or may have been moved.
            Let's get you back on track.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="primary" size="lg" onClick={() => navigate('/')}>
            Go to Home
          </Button>
          <Button variant="secondary" size="lg" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
        <div className="mt-8 flex items-center justify-center gap-6 text-sm">
          <button onClick={() => navigate('/find-care')} className="text-brand-600 hover:underline font-medium">
            Find Care
          </button>
          <button onClick={() => navigate('/provide-care')} className="text-brand-600 hover:underline font-medium">
            Become a Caregiver
          </button>
          <button onClick={() => navigate('/contact')} className="text-brand-600 hover:underline font-medium">
            Contact Us
          </button>
        </div>
      </div>
    </div>
  );
}
