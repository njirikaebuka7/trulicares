import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { requests as requestsApi, matches as matchesApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { CareCategory } from '@/types';

import CareTypeStep from '@/components/questionnaire/CareTypeStep';
import ChildCareFlow from '@/components/questionnaire/ChildCareFlow';
import SeniorCareFlow from '@/components/questionnaire/SeniorCareFlow';
import AdultCareFlow from '@/components/questionnaire/AdultCareFlow';
import CleaningFlow from '@/components/questionnaire/CleaningFlow';
import AccountStep from '@/components/questionnaire/AccountStep';
import ReviewStep from '@/components/questionnaire/ReviewStep';
import MatchingStep from '@/components/questionnaire/MatchingStep';
import MatchesListStep from '@/components/questionnaire/MatchesListStep';
import PaymentStep from '@/components/questionnaire/PaymentStep';
import VerificationStep from '@/components/questionnaire/VerificationStep';
import MessagingStep from '@/components/questionnaire/MessagingStep';
import { Clock, CheckCircle, ArrowRight, Loader2, MessageCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { get, post } from '@/lib/api';
import { supabase } from '@/lib/supabase';

type FlowPhase = 'care-type' | 'care-details' | 'account' | 'review' | 'matching' | 'matches' | 'payment' | 'verification' | 'messaging' | 'pending-acceptance';

interface LocationState {
  preselectedCategory?: string;
  directRequest?: boolean;
  caregiverId?: string;
}

export default function FindCare() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  const state = (location.state as LocationState) || {};
  const preselected = state.preselectedCategory;
  const isDirectRequest = state.directRequest === true;
  const directCaregiverId = state.caregiverId;

  const [phase, setPhase] = useState<FlowPhase>('care-type');
  const [careCategory, setCareCategory] = useState<CareCategory | null>(null);
  const [careData, setCareData] = useState<Record<string, unknown>>({});
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedCaregiverId, setSelectedCaregiverId] = useState<string | null>(directCaregiverId || null);

  const cancelDestination = isAuthenticated ? '/dashboard' : '/';

  useEffect(() => {
    if (preselected) {
      setCareCategory(preselected as CareCategory);
      setPhase('care-details');
    }
  }, [preselected]);

  const handleCareTypeSelect = (type: CareCategory) => {
    setCareCategory(type);
    setPhase('care-details');
  };

  const handleCareDetailsComplete = (data: Record<string, unknown>) => {
    setCareData(data);
    // Skip account step if already authenticated
    setPhase(isAuthenticated ? 'review' : 'account');
  };

  const handleAccountComplete = () => {
    setPhase('review');
  };

  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmitReview = async () => {
    setSubmitError(null);
    try {
      const payload: any = {
        careType: careCategory,
        location: (careData.location as string) || '',
        details: careData,
      };

      if (isDirectRequest && directCaregiverId) {
        payload.caregiverId = directCaregiverId;
        const result: any = await requestsApi.create(payload);
        if (!result?.matchId) {
          throw new Error('Failed to create direct request — no match returned.');
        }
        setCurrentRequestId(result.request?.id || null);
        setSelectedMatchId(result.matchId);
        setSelectedCaregiverId(directCaregiverId);
        setPhase('pending-acceptance');
        return;
      }

      const res: any = await requestsApi.create(payload);
      setCurrentRequestId(res.request?.id || null);
    } catch (err: any) {
      if (isDirectRequest) {
        setSubmitError(err?.message || 'Could not submit your care request. Please try again.');
        return;
      }
    }
    setPhase('matching');
  };

  const handleMatchingComplete = () => {
    setPhase('matches');
  };

  const handleSelectMatch = async (matchId: string, caregiverId?: string) => {
    try {
      await matchesApi.request(matchId);
      setSelectedMatchId(matchId);
      if (caregiverId) setSelectedCaregiverId(caregiverId);
      setPhase('pending-acceptance');
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to request caregiver. Please try again.');
    }
  };

  const handlePaymentComplete = () => {
    setPhase('verification');
  };

  const handleVerificationComplete = () => {
    setPhase('messaging');
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-9 h-9 rounded-full border-4 border-brand-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  switch (phase) {
    case 'care-type':
      return (
        <CareTypeStep
          onSelect={handleCareTypeSelect}
          onCancel={() => navigate(cancelDestination)}
        />
      );
    case 'care-details':
      if (!careCategory) return null;
      switch (careCategory) {
        case 'child-care':
          return <ChildCareFlow onComplete={handleCareDetailsComplete} onBack={() => setPhase('care-type')} onCancel={() => navigate(cancelDestination)} />;
        case 'senior-care':
          return <SeniorCareFlow onComplete={handleCareDetailsComplete} onBack={() => setPhase('care-type')} onCancel={() => navigate(cancelDestination)} />;
        case 'adult-care':
          return <AdultCareFlow onComplete={handleCareDetailsComplete} onBack={() => setPhase('care-type')} onCancel={() => navigate(cancelDestination)} />;
        case 'cleaning':
          return <CleaningFlow onComplete={handleCareDetailsComplete} onBack={() => setPhase('care-type')} onCancel={() => navigate(cancelDestination)} />;
        default:
          return null;
      }
    case 'account':
      return <AccountStep onComplete={handleAccountComplete} onBack={() => setPhase('care-details')} onCancel={() => navigate(cancelDestination)} cancelLabel={isAuthenticated ? 'Back to Dashboard' : 'Back to Home'} />;
    case 'review':
      return (
        <ReviewStep
          careCategory={careCategory!}
          careData={careData}
          onSubmit={handleSubmitReview}
          onBack={() => setPhase(isAuthenticated ? 'care-details' : 'account')}
          onCancel={() => navigate(cancelDestination)}
          errorMessage={submitError}
        />
      );
    case 'matching':
      return <MatchingStep requestId={currentRequestId} onComplete={handleMatchingComplete} onCancel={() => navigate(cancelDestination)} />;
    case 'matches':
      return (
        <MatchesListStep
          requestId={currentRequestId || undefined}
          onSelectMatch={handleSelectMatch}
          onBack={() => setPhase('matching')}
          familyLocation={(careData.location as string) || ''}
          onCancel={() => navigate(cancelDestination)}
        />
      );
    case 'payment':
      return (
        <PaymentStep
          matchId={selectedMatchId!}
          caregiverId={selectedCaregiverId || undefined}
          onComplete={handlePaymentComplete}
          onBack={() => setPhase(isDirectRequest ? 'review' : 'matches')}
          onCancel={() => navigate(cancelDestination)}
          cancelLabel={isAuthenticated ? 'Back to Dashboard' : 'Back to Home'}
        />
      );
    case 'verification':
      return (
        <VerificationStep
          onComplete={handleVerificationComplete}
          onBack={() => setPhase('payment')}
          onCancel={() => navigate(cancelDestination)}
          cancelLabel={isAuthenticated ? 'Back to Dashboard' : 'Back to Home'}
        />
      );
    case 'pending-acceptance':
      return (
        <PendingAcceptanceStep
          matchId={selectedMatchId!}
          onAccepted={() => setPhase('payment')}
          onDashboard={handleGoToDashboard}
        />
      );
    case 'messaging':
      return <MessagingStep matchId={selectedMatchId!} onDashboard={handleGoToDashboard} onBack={() => setPhase('verification')} />;
    default:
      return null;
  }
}

function PendingAcceptanceStep({ matchId, onAccepted, onDashboard }: { matchId: string, onAccepted: () => void, onDashboard: () => void }) {
  const [status, setStatus] = useState<'pending' | 'accepted' | 'declined'>('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial fetch and backup polling to check current status
    const checkStatus = async () => {
      try {
        const d: any = await get('/matches');
        const match = d.matches?.find((m: any) => m.id === matchId);
        if (match) {
          if (match.status === 'accepted') {
            setStatus('accepted');
            // Automatic transition if already accepted
            setTimeout(onAccepted, 1500);
            return true; // Stop polling
          } else if (match.status === 'declined') {
            setStatus('declined');
            return true; // Stop polling
          }
        }
      } catch (err) {
        console.error('Status check error:', err);
      } finally {
        setLoading(false);
      }
      return false;
    };

    checkStatus();

    // Continuous backup polling every 1.5 seconds to guarantee instant response
    const interval = setInterval(async () => {
      const stop = await checkStatus();
      if (stop) clearInterval(interval);
    }, 1500);

    // 2. Real-time subscription to status changes
    const channel = supabase
      .channel(`match-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        (payload: any) => {
          const newStatus = payload.new.status;
          if (newStatus === 'accepted') {
            setStatus('accepted');
            clearInterval(interval);
            // Give user a moment to see the "Accepted" state before auto-transitioning
            setTimeout(onAccepted, 2000);
          } else if (newStatus === 'declined') {
            setStatus('declined');
            clearInterval(interval);
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [matchId, onAccepted]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-coral-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-sm w-full bg-white rounded-[2rem] shadow-2xl shadow-brand-500/10 p-10 space-y-8 border border-brand-100">
        {status === 'pending' ? (
          <>
            <div className="relative">
              <div className="absolute inset-0 bg-brand-200 rounded-full blur-2xl opacity-20 animate-pulse" />
              <div className="relative w-24 h-24 bg-brand-50 rounded-3xl flex items-center justify-center mx-auto">
                <Clock className="w-12 h-12 text-brand-600 animate-pulse" />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Sent!</h2>
              <p className="text-gray-500 leading-relaxed px-4">
                We've sent your request to the caregiver. They'll review it and respond shortly.
              </p>
            </div>
            <div className="bg-brand-50/50 rounded-2xl p-4 flex items-center justify-center gap-3 border border-brand-100/50">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" />
              </div>
              <span className="text-sm font-bold text-brand-700 tracking-wide uppercase">Waiting for response</span>
            </div>
          </>
        ) : status === 'accepted' ? (
          <>
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-200 rounded-full blur-2xl opacity-30 animate-pulse" />
              <div className="relative w-24 h-24 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto">
                <CheckCircle className="w-12 h-12 text-emerald-500" />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight text-emerald-600">Accepted!</h2>
              <p className="text-gray-500 leading-relaxed px-4">
                Great news! The caregiver has accepted your request. Moving to payment...
              </p>
            </div>
            <div className="pt-4">
              <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mx-auto" />
            </div>
          </>
        ) : (
          <>
            <div className="w-24 h-24 bg-red-50 rounded-3xl flex items-center justify-center mx-auto">
              <Clock className="w-12 h-12 text-red-500" />
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight text-red-600">Unavailable</h2>
              <p className="text-gray-500 leading-relaxed px-4">
                Unfortunately, the caregiver is unavailable at this time.
              </p>
            </div>
            <Button variant="primary" fullWidth onClick={onDashboard}>
              Find Another Caregiver
            </Button>
          </>
        )}

        <div className="pt-4 border-t border-gray-100">
          <Button variant="ghost" fullWidth onClick={onDashboard}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
