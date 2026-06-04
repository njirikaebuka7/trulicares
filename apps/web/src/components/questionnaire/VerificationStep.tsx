import { useState } from 'react';
import { Mail, Shield, Check, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import { auth as authApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import logoImg from '@/assets/logo.png';

interface Props {
  onComplete: () => void;
  onBack?: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
}

type Step = 'start' | 'otp' | 'confirmed';

export default function VerificationStep({ onComplete, onBack, onCancel, cancelLabel }: Props) {
  const { user } = useAuth();
  const email = user?.email || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<Step>('start');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSendCode = async () => {
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const res: any = await authApi.sendEmailCode(email);
      if (res?.alreadyVerified) {
        setStep('confirmed');
        return;
      }
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.some(d => !d)) return;
    setLoading(true);
    setError('');
    try {
      await authApi.verifyEmailCode(email, otp.join(''));
      setStep('confirmed');
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setOtp(['', '', '', '', '', '']);
    setError('');
    try {
      await authApi.sendEmailCode(email);
      setInfo('A new code is on its way to your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-coral-50 flex flex-col">
      {/* Header with logo */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-100 px-4 py-3 flex items-center">
        {onBack && (
          <button onClick={onBack} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
        )}
        <div className="flex-1 flex justify-center">
          <Link to="/"><img src={logoImg} alt="TruliCares" className="h-7 w-auto" /></Link>
        </div>
        {onCancel ? (
          <button onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-600 font-medium px-2">{cancelLabel || 'Cancel'}</button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full px-4 py-8">

        {/* ── CONFIRMED ── */}
        {step === 'confirmed' && (
          <div className="text-center space-y-6">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30 animate-bounce-once">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
              <p className="text-gray-500 text-sm">
                <span className="font-semibold text-gray-800">{email}</span> has been successfully verified.
              </p>
            </div>
            <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 text-left space-y-3">
              {[
                'Identity confirmed',
                'Account secured',
                'Ready to connect with caregivers',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-emerald-800">{item}</span>
                </div>
              ))}
            </div>
            <Button variant="primary" size="xl" fullWidth onClick={onComplete} icon={<ArrowRight className="w-5 h-5" />}>
              Continue to Your Matches
            </Button>
          </div>
        )}

        {/* ── START: confirm email + send code ── */}
        {step === 'start' && (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h2>
              <p className="text-gray-500 text-sm">We'll send a 6-digit verification code to your email to secure your account.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your email address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 bg-gray-50 text-lg text-gray-700 outline-none"
                  />
                </div>
              </div>
              <Button
                variant="primary" size="xl" fullWidth
                onClick={handleSendCode}
                loading={loading}
                disabled={!email}
              >
                Send Verification Code
              </Button>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            </div>
          </>
        )}

        {/* ── OTP ENTRY ── */}
        {step === 'otp' && (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Enter Verification Code</h2>
              <p className="text-gray-500 text-sm">We sent a 6-digit code to <span className="font-semibold text-gray-800">{email}</span></p>
            </div>
            <div className="space-y-6">
              <div className="flex justify-center gap-3">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOTPChange(i, e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Backspace' && !digit && i > 0) {
                        const prevInput = document.getElementById(`otp-${i - 1}`);
                        prevInput?.focus();
                      }
                    }}
                    className="w-12 h-14 rounded-xl border-2 border-gray-200 text-center text-xl font-bold focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
                  />
                ))}
              </div>
              <Button
                variant="primary" size="xl" fullWidth
                onClick={handleVerify}
                loading={loading}
                disabled={otp.some(d => !d)}
              >
                Verify & Continue
              </Button>
              {info && <p className="text-emerald-600 text-sm text-center">{info}</p>}
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <button
                onClick={handleResend}
                className="w-full text-center text-sm text-brand-600 font-medium hover:underline"
              >
                Didn't get it? Resend code
              </button>
            </div>
          </>
        )}

        {/* Trust indicators */}
        {step !== 'confirmed' && (
          <div className="mt-8 flex items-center justify-center gap-6">
            {['Secure', 'Private', 'One-time'].map((label, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                <Check className="w-4 h-4 text-brand-500" />
                {label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
