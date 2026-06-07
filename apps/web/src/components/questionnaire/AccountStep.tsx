import { useState } from 'react';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Shield } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { auth as authApi } from '@/lib/api';

interface Props {
  onComplete: () => void;
  onBack: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
}

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function AccountStep({ onComplete, onBack, onCancel, cancelLabel }: Props) {
  const { isAuthenticated, signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  if (isAuthenticated) {
    onComplete();
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (!STRONG_PASSWORD_REGEX.test(password)) {
      setError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res: any = await authApi.sendEmailCode(email);
      if (res?.alreadyVerified) {
        // Email is already verified — register directly
        await signup(email, password, email.split('@')[0], 'family', undefined);
        onComplete();
      } else {
        setOtpSent(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.some(d => !d)) return;
    setLoading(true);
    setError('');
    try {
      await authApi.verifyEmailCode(email, otp.join(''));
      // Code verified successfully — register family account
      await signup(email, password, email.split('@')[0], 'family', undefined);
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError('');
    try {
      await authApi.sendEmailCode(email);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (otpSent) {
      setOtpSent(false);
      setOtp(['', '', '', '', '', '']);
      setError('');
    } else {
      onBack();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-coral-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1 text-center">
            <span className="text-sm font-medium text-gray-500">Almost there!</span>
          </div>
          {onCancel ? (
            <button onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-600 font-medium px-2">{cancelLabel || 'Cancel'}</button>
          ) : (
            <div className="w-10" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {otpSent ? <Shield className="w-8 h-8 text-white" /> : <Mail className="w-8 h-8 text-white" />}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {otpSent ? 'Verify Your Email' : 'Create your account'}
          </h2>
          <p className="text-gray-500 text-sm">
            {otpSent ? "We've sent a 6-digit verification code to your email." : 'Sign up to submit your care request and get matched.'}
          </p>
        </div>

        {!otpSent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-gray-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="w-full pl-12 pr-12 py-3.5 rounded-2xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-gray-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {password && !STRONG_PASSWORD_REGEX.test(password) && (
                <p className="text-xs text-red-500 mt-1.5 font-medium leading-tight">
                  Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">{error}</div>
            )}

            <Button type="submit" variant="primary" size="xl" fullWidth loading={loading}>
              Create Account & Continue
            </Button>
          </form>
        ) : (
          <div className="space-y-6">
            <p className="text-center text-sm text-gray-500">
              Enter the 6-digit code sent to <span className="font-semibold text-gray-800">{email}</span>.
            </p>
            <div className="flex justify-center gap-2">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length > 1) return;
                    const newOtp = [...otp];
                    newOtp[i] = val;
                    setOtp(newOtp);
                    if (val && i < 5) document.getElementById(`otp-${i+1}`)?.focus();
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Backspace' && !otp[i] && i > 0) document.getElementById(`otp-${i-1}`)?.focus();
                  }}
                  className="w-10 h-12 rounded-xl border-2 border-gray-200 text-center text-xl font-bold focus:border-brand-400 outline-none"
                />
              ))}
            </div>
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl text-center">{error}</div>
            )}
            <Button variant="primary" size="xl" fullWidth loading={loading} onClick={handleVerifyOtp} disabled={otp.some(d => !d)}>
              Verify & Create Account
            </Button>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={handleResendOtp} className="w-full text-center text-xs text-brand-600 font-medium hover:underline">
                Resend code
              </button>
              <button type="button" onClick={() => { setOtpSent(false); setOtp(['', '', '', '', '', '']); setError(''); }} className="w-full text-center text-xs text-gray-500 hover:text-gray-700 hover:underline">
                Change email or password
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-500 mt-6">
          By signing up, you agree to our{' '}
          <a href="/terms" className="text-brand-600 hover:underline">Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy-policy" className="text-brand-600 hover:underline">Privacy Policy</a>.
        </p>

        <div className="mt-8 text-center">
          <span className="text-sm text-gray-500">Already have an account?</span>{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-sm font-semibold text-brand-600 hover:underline"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
