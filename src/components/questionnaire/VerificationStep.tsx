import { useState } from 'react';
import { Phone, Shield, Check } from 'lucide-react';
import Button from '@/components/ui/Button';

interface Props {
  onComplete: () => void;
}

export default function VerificationStep({ onComplete }: Props) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) return;
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
    onComplete();
  };

  const handleOTPChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    // Auto focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-coral-50 flex flex-col">
      {/* Content */}
      <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {step === 'phone' ? 'Verify Your Identity' : 'Enter Verification Code'}
          </h2>
          <p className="text-gray-500 text-sm">
            {step === 'phone'
              ? 'We need to verify your phone number for safety.'
              : `We sent a 6-digit code to ${phone}`}
          </p>
        </div>

        {step === 'phone' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="(555) 123-4567"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none text-lg"
                />
              </div>
            </div>

            <Button variant="primary" size="xl" fullWidth onClick={handleSendOTP} loading={loading} disabled={phone.length < 10}>
              Send Verification Code
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* OTP inputs */}
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
              variant="primary"
              size="xl"
              fullWidth
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
        )}

        {/* Trust indicators */}
        <div className="mt-8 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Check className="w-4 h-4 text-brand-500" />
            Secure
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Check className="w-4 h-4 text-brand-500" />
            Private
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Check className="w-4 h-4 text-brand-500" />
            One-time
          </div>
        </div>
      </div>
    </div>
  );
}
