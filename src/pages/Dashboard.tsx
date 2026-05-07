import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, MessageCircle, User, Settings, LogOut, Plus, MapPin, DollarSign, Clock, Star, Shield, Check, ChevronRight, Briefcase } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { mockMatches, mockCaregivers, careCategoryLabels } from '@/data/mock';
import { cn } from '@/utils/cn';

const tabs = ['Overview', 'Matches', 'Messages', 'Profile'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('Overview');

  const isCaregiver = user?.role === 'caregiver';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-16 lg:top-[72px] z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
            <div className="flex items-center gap-2">
              <button className="relative w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-coral-500 rounded-full" />
              </button>
              <button onClick={handleLogout} className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <LogOut className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-3">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors',
                  activeTab === tab ? 'bg-brand-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'Overview' && (
          <div className="space-y-6">
            {/* Welcome */}
            <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-3xl p-6 text-white">
              <h2 className="text-2xl font-bold mb-2">Welcome back, {user?.name || 'User'}! 👋</h2>
              <p className="text-brand-100 mb-4">
                {isCaregiver
                  ? 'You have new care matches waiting for you.'
                  : 'Your care journey continues here.'}
              </p>
              <Button
                variant="secondary"
                size="md"
                onClick={() => navigate(isCaregiver ? '/dashboard' : '/find-care')}
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
                {isCaregiver ? 'View Matches' : 'Post New Request'}
                <Plus className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Stats */}
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: 'Active Matches', value: mockMatches.filter(m => m.status === 'accepted').length, icon: <Briefcase className="w-5 h-5" /> },
                { label: 'Messages', value: 3, icon: <MessageCircle className="w-5 h-5" /> },
                { label: 'Profile Views', value: 47, icon: <User className="w-5 h-5" /> },
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-500 text-sm">{stat.label}</span>
                    <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
                      {stat.icon}
                    </div>
                  </div>
                  <span className="text-3xl font-bold text-gray-900">{stat.value}</span>
                </div>
              ))}
            </div>

            {/* Recent matches */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Recent Matches</h3>
                <button onClick={() => setActiveTab('Matches')} className="text-sm text-brand-600 font-medium hover:underline">
                  View all
                </button>
              </div>
              <div className="space-y-3">
                {mockMatches.slice(0, 3).map((match, i) => (
                  <div key={match.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-4">
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold',
                      ['bg-coral-400', 'bg-brand-400', 'bg-sky-400'][i % 3]
                    )}>
                      {match.caregiver.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900">{match.caregiver.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{careCategoryLabels[match.careType]}</span>
                        <span>•</span>
                        <span>{match.budget}</span>
                      </div>
                    </div>
                    <span className={cn(
                      'px-3 py-1 rounded-full text-xs font-semibold',
                      match.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    )}>
                      {match.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Matches' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Your Matches</h2>
            {mockMatches.map((match, i) => (
              <div key={match.id} className="bg-white rounded-3xl p-5 border border-gray-100">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0',
                    ['bg-coral-400', 'bg-brand-400', 'bg-sky-400'][i % 3]
                  )}>
                    {match.caregiver.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900">{match.caregiver.name}</h3>
                      {match.caregiver.verified && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
                          <Shield className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <Star className="w-4 h-4 text-warm-400 fill-warm-400" />
                      <span className="font-semibold text-gray-700">{match.caregiver.rating}</span>
                      <span>({match.caregiver.reviewCount} reviews)</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{match.caregiver.bio}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className="flex items-center gap-1 text-gray-500">
                        <MapPin className="w-4 h-4" /> {match.location}
                      </span>
                      <span className="flex items-center gap-1 text-brand-600 font-semibold">
                        <DollarSign className="w-4 h-4" /> {match.budget}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  {match.messagingUnlocked ? (
                    <Button variant="primary" size="md" icon={<MessageCircle className="w-4 h-4" />}>
                      Message
                    </Button>
                  ) : (
                    <Button variant="secondary" size="md">
                      Unlock Messaging
                    </Button>
                  )}
                  <Button variant="ghost" size="md">
                    View Profile
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Messages' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Messages</h2>
            {mockCaregivers.slice(0, 3).map((cg, i) => (
              <div key={cg.id} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-4 cursor-pointer hover:border-brand-200 transition-colors">
                <div className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0',
                  ['bg-coral-400', 'bg-brand-400', 'bg-sky-400'][i % 3]
                )}>
                  {cg.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900">{cg.name}</h4>
                    <span className="text-xs text-gray-400">2:35 PM</span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">Thank you for reaching out! I'd love to...</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Profile' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-600">
                  <User className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{user?.name || 'User'}</h2>
                  <p className="text-gray-500">{user?.email}</p>
                  <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
                    {user?.verified ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {user?.verified ? 'Verified' : 'Pending Verification'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700">Edit Profile</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </button>
                <button className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700">Account Settings</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </button>
                <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-red-50 transition-colors text-red-600">
                  <div className="flex items-center gap-3">
                    <LogOut className="w-5 h-5" />
                    <span>Log Out</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-red-300" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
