import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Mail, Settings as SettingsIcon, KeyRound, LogOut, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { auth as authApi } from '@/lib/api';
import { toast } from '@/components/ui/Toaster';
import { cn } from '@/utils/cn';
import logoImg from '@/assets/logo.png';
import AdminContent from '@/components/admin/AdminContent';
import AdminSettings from '@/components/admin/AdminSettings';
import AdminSupport from '@/components/admin/AdminSupport';

type Tab = 'posts' | 'contact' | 'support' | 'account';

const NAV: { id: Tab; label: string; short: string; icon: React.ReactNode }[] = [
  { id: 'posts', label: 'Posts', short: 'Posts', icon: <FileText className="w-5 h-5" /> },
  { id: 'contact', label: 'Contact & Social', short: 'Contact', icon: <SettingsIcon className="w-5 h-5" /> },
  { id: 'support', label: 'Support Messages', short: 'Support', icon: <Mail className="w-5 h-5" /> },
  { id: 'account', label: 'Account', short: 'Account', icon: <KeyRound className="w-5 h-5" /> },
];

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function ChangePasswordPanel() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!current || !next) return toast('Fill in all fields', 'error');
    if (next !== confirm) return toast('New passwords do not match', 'error');
    if (!STRONG_PASSWORD_REGEX.test(next)) {
      return toast('Password needs 8+ chars with upper, lower, number & symbol', 'error');
    }
    setSaving(true);
    try {
      await authApi.changePassword(current, next);
      toast('Password updated', 'success');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (e: any) {
      toast(e?.message || 'Failed to change password', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-md space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Change password</h2>
        <p className="text-sm text-gray-500">Update the password for your support-admin account.</p>
      </div>
      <div className="space-y-3">
        {[
          { label: 'Current password', val: current, set: setCurrent },
          { label: 'New password', val: next, set: setNext },
          { label: 'Confirm new password', val: confirm, set: setConfirm },
        ].map((f) => (
          <div key={f.label}>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{f.label}</label>
            <input
              type="password"
              value={f.val}
              onChange={(e) => f.set(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
        ))}
        <button
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-700 hover:bg-brand-800 text-white font-semibold text-sm disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          Update password
        </button>
      </div>
    </div>
  );
}

export default function SupportAdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('posts');

  const handleLogout = () => { logout(); navigate('/login'); };
  const activeLabel = NAV.find((n) => n.id === tab)?.label;

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-slate-900 text-white">
        <div className="h-14 flex items-center gap-2 px-5 border-b border-slate-700/60">
          <img src={logoImg} alt="TruliCares" className="h-6 w-auto brightness-0 invert" />
          <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-semibold">Support</span>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                tab === item.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="px-2 py-3 border-t border-slate-700/60">
          <div className="px-3 py-2 mb-1 text-xs text-slate-400 truncate flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-brand-400" /> {user?.email}
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" /> Log Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Link to="/"><img src={logoImg} alt="TruliCares" className="h-6 w-auto lg:hidden" /></Link>
            <h1 className="text-base font-bold text-gray-900">{activeLabel}</h1>
          </div>
          <button onClick={handleLogout} className="lg:hidden text-gray-400 hover:text-red-500" aria-label="Log out">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Content (bottom padding leaves room for mobile nav) */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-5 pb-24 lg:pb-8">
          {tab === 'posts' && <AdminContent />}
          {tab === 'contact' && <AdminSettings />}
          {tab === 'support' && <AdminSupport />}
          {tab === 'account' && <ChangePasswordPanel />}
        </main>

        {/* ── Mobile bottom nav ── */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-200 flex">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold',
                tab === item.id ? 'text-brand-700' : 'text-gray-400'
              )}
            >
              {item.icon}
              {item.short}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
