import { useState } from 'react';
import { Phone, Shield, Check, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import logoImg from '@/assets/logo.png';

interface Props {
  onComplete: () => void;
  onBack?: () => void;
  onCancel?: () => void;
}

type Step = 'phone' | 'otp' | 'confirmed';

function formatUSPhone(digits: string): string {
  const d = digits.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export default function VerificationStep({ onComplete, onBack, onCancel }: Props) {
  const [phoneDigits, setPhoneDigits] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<Step>('phone');
  const [loading, setLoading] = useState(false);

  const handlePhoneInput = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    setPhoneDigits(digits);
  };

  const handleSendOTP = async () => {
    if (phoneDigits.length < 10) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    setStep('otp');
  };

  const handleVerifyOTP = async () => {
    if (otp.some(d => !d)) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    setStep('confirmed');
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

  const displayPhone = `+1 ${formatUSPhone(phoneDigits)}`;

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
          <button onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-600 font-medium px-2">Cancel</button>
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Phone Verified!</h2>
              <p className="text-gray-500 text-sm">
                <span className="font-semibold text-gray-800">{displayPhone}</span> has been successfully verified.
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

        {/* ── PHONE INPUT ── */}
        {step === 'phone' && (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Identity</h2>
              <p className="text-gray-500 text-sm">We need to verify your US phone number for safety.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">US Phone Number</label>
                <div className="flex gap-2">
                  {/* Country prefix */}
                  <div className="flex items-center gap-2 px-3 py-4 rounded-2xl border border-gray-200 bg-gray-50 shrink-0">
                    <span className="text-xl leading-none">🇺🇸</span>
                    <span className="text-sm font-semibold text-gray-700">+1</span>
                  </div>
                  {/* Phone input */}
                  <div className="relative flex-1">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={formatUSPhone(phoneDigits)}
                      onChange={e => handlePhoneInput(e.target.value)}
                      placeholder="(555) 123-4567"
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-lg"
                    />
                  </div>
                </div>
              </div>
              <Button
                variant="primary" size="xl" fullWidth
                onClick={handleSendOTP}
                loading={loading}
                disabled={phoneDigits.length < 10}
              >
                Send Verification Code
              </Button>
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
              <p className="text-gray-500 text-sm">We sent a 6-digit code to <span className="font-semibold text-gray-800">{displayPhone}</span></p>
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
                onClick={handleVerifyOTP}
                loading={loading}
                disabled={otp.some(d => !d)}
              >
                Verify & Continue
              </Button>
              <button
                onClick={() => setStep('phone')}
                className="w-full text-center text-sm text-brand-600 font-medium hover:underline"
              >
                Change phone number
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
