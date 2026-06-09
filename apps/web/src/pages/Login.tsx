import { useState } from 'react';
import { Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Shield, Check, ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import GetStartedModal from '@/components/ui/GetStartedModal';
import GoogleSignInButton, { GOOGLE_ENABLED } from '@/components/auth/GoogleSignInButton';
import logoImg from '@/assets/logo.png';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, isLoading: authLoading, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showGetStarted, setShowGetStarted] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-9 h-9 rounded-full border-4 border-brand-600 border-t-transparent animate-spin" />
      </div>
    );
  }
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) return;
    setLoading(true);
    try {
      const { post } = await import('@/lib/api');
      await post('/auth/forgot-password', { email: forgotEmail.trim() });
    } catch {}
    setLoading(false);
    setForgotSent(true);
  };

  // Send the user to the right place after authenticating.
  const redirectAfterAuth = (role: string) => {
    const locState = location.state as any;
    const redirectPath = locState?.from;
    if (redirectPath) navigate(redirectPath);
    else if (role === 'professional') navigate('/professional-dashboard');
    else if (role === 'facility') navigate('/facility-dashboard');
    else navigate('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const userData = await login(email, password);
      redirectAfterAuth(userData.role);
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (credential: string) => {
    setLoading(true);
    setError('');
    try {
      const userData = await loginWithGoogle(credential);
      redirectAfterAuth(userData.role);
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex">
        {/* Left - branding panel (hidden on mobile) */}
        <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 relative overflow-hidden flex-col justify-between p-12">
          <div className="absolute top-20 -left-10 w-72 h-72 bg-brand-500/15 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-0 w-60 h-60 bg-coral-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-warm-400/8 rounded-full blur-3xl" />

          <div className="relative">
            <Link to="/" className="flex items-center mb-16">
              <img src={logoImg} alt="TruliCares" className="h-9 w-auto brightness-0 invert opacity-90" />
            </Link>

            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
              Welcome back to your{' '}
              <span className="bg-gradient-to-r from-brand-300 to-coral-400 bg-clip-text text-transparent">
                care community
              </span>
            </h1>
            <p className="text-brand-200 text-lg leading-relaxed">
              Continue your journey with trusted caregivers and seamless care management.
            </p>
          </div>

          <div className="relative space-y-4">
            {[
              { icon: <Shield className="w-4 h-4" />, text: 'Verified caregivers you can trust' },
              { icon: <Check className="w-4 h-4" />, text: 'Pay only when matched' },
              { icon: <ArrowRight className="w-4 h-4" />, text: 'Get matched in minutes' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 glass rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-brand-400/20 flex items-center justify-center text-brand-300">
                  {item.icon}
                </div>
                <span className="text-sm text-brand-100 font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right - login form */}
        <div className="flex-1 flex flex-col">
          {/* Mobile header */}
          <div className="lg:hidden px-6 pt-6">
            <Link to="/">
              <img src={logoImg} alt="TruliCares" className="h-8 w-auto" />
            </Link>
          </div>

          <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12">
            <div className="w-full max-w-md">

              {/* ── FORGOT PASSWORD ── */}
              {forgotMode ? (
                forgotSent ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                      <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
                    <p className="text-gray-500 mb-1">We sent a reset link to</p>
                    <p className="font-semibold text-gray-800 mb-8">{forgotEmail}</p>
                    <Button variant="secondary" size="lg" fullWidth onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(''); }}>
                      Back to Sign In
                    </Button>
                    <p className="text-xs text-gray-400 mt-4">
                      Didn't receive it? Check your spam folder or{' '}
                      <button className="text-brand-600 hover:underline" onClick={() => { setForgotSent(false); }}>try again</button>
                    </p>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => setForgotMode(false)}
                      className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 mb-8 text-sm font-medium transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back to sign in
                    </button>
                    <div className="mb-8">
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">Forgot password?</h2>
                      <p className="text-gray-500">Enter your email and we'll send a reset link.</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Email address</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="email"
                            value={forgotEmail}
                            onChange={e => setForgotEmail(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleForgotPassword()}
                            placeholder="you@example.com"
                            autoFocus
                            className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none text-gray-800 transition-all bg-gray-50 focus:bg-white"
                          />
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="xl"
                        fullWidth
                        onClick={handleForgotPassword}
                        disabled={!forgotEmail.trim()}
                        loading={loading}
                      >
                        Send Reset Link <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              ) : (
              <>
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign in</h2>
                <p className="text-gray-500">Enter your credentials to access your dashboard.</p>
              </div>

              {/* Google sign-in (renders only when VITE_GOOGLE_CLIENT_ID is configured) */}
              {GOOGLE_ENABLED && (
                <>
                  <div className="mb-6">
                    <GoogleSignInButton onCredential={handleGoogle} />
                  </div>

                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white px-4 text-gray-400 font-medium">or continue with email</span>
                    </div>
                  </div>
                </>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none text-gray-800 transition-all bg-gray-50 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">Password</label>
                    <button type="button" onClick={() => setForgotMode(true)} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-12 pr-12 py-3.5 rounded-xl border-2 border-gray-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none text-gray-800 transition-all bg-gray-50 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 flex items-center gap-2">
                    <span className="shrink-0">⚠️</span> {error}
                  </div>
                )}

                <Button type="submit" variant="primary" size="xl" fullWidth loading={loading}>
                  Sign In
                </Button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-8">
                Don't have an account?{' '}
                <button
                  onClick={() => setShowGetStarted(true)}
                  className="text-brand-600 font-semibold hover:underline"
                >
                  Join instead
                </button>
              </p>
            </>
            )}
            </div>
          </div>
        </div>
      </div>

      <GetStartedModal open={showGetStarted} onClose={() => setShowGetStarted(false)} />
    </>
  );
}
