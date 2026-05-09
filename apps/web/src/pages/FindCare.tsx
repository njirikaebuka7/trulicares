import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { requests as requestsApi } from '@/lib/api';
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

      // For direct caregiver requests, pass caregiverId to create a match immediately
      if (isDirectRequest && directCaregiverId) {
        payload.caregiverId = directCaregiverId;
        const result: any = await requestsApi.create(payload);
        if (!result?.matchId) {
          throw new Error('Failed to create direct request — no match returned.');
        }
        setSelectedMatchId(result.matchId);
        setSelectedCaregiverId(directCaregiverId);
        setPhase('pending-acceptance');
        return;
      }

      await requestsApi.create(payload);
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

  const handleSelectMatch = (matchId: string, caregiverId?: string) => {
    setSelectedMatchId(matchId);
    if (caregiverId) setSelectedCaregiverId(caregiverId);
    setPhase('payment');
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
      return <MatchingStep onComplete={handleMatchingComplete} onCancel={() => navigate(cancelDestination)} />;
    case 'matches':
      return (
        <MatchesListStep
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
    const checkStatus = async () => {
      try {
        const d: any = await get('/matches');
        const match = d.matches?.find((m: any) => m.id === matchId);
        if (match) {
          if (match.status === 'accepted') {
            setStatus('accepted');
          } else if (match.status === 'declined') {
            setStatus('declined');
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
    const timer = setInterval(checkStatus, 5000);
    return () => clearInterval(timer);
  }, [matchId]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-sm w-full bg-white rounded-3xl shadow-xl p-8 space-y-6">
        {status === 'pending' ? (
          <>
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Clock className="w-10 h-10 text-amber-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Request Sent!</h2>
              <p className="text-gray-500 mt-2">Waiting for the caregiver to review and accept your request.</p>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-amber-600 font-medium">
              <Loader2 className="w-4 h-4 animate-spin" /> Real-time status tracking active
            </div>
          </>
        ) : status === 'accepted' ? (
          <>
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Good News!</h2>
              <p className="text-gray-500 mt-2">The caregiver has accepted your request. You can now unlock direct messaging.</p>
            </div>
            <Button variant="primary" size="xl" fullWidth onClick={onAccepted}>
              Unlock Direct Messaging <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <Clock className="w-10 h-10 text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Request Declined</h2>
              <p className="text-gray-500 mt-2">Unfortunately, the caregiver is unavailable at this time. You can find other matches in your dashboard.</p>
            </div>
          </>
        )}

        <div className="pt-4 border-t border-gray-100">
          <Button variant="ghost" fullWidth onClick={onDashboard}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
