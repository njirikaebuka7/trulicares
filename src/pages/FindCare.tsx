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

type FlowPhase = 'care-type' | 'care-details' | 'account' | 'review' | 'matching' | 'matches' | 'payment' | 'verification' | 'messaging';

interface LocationState {
  preselectedCategory?: string;
  directRequest?: boolean;
  caregiverId?: string;
}

export default function FindCare() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

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
        setPhase('payment');
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
      return <AccountStep onComplete={handleAccountComplete} onBack={() => setPhase('care-details')} />;
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
        />
      );
    case 'verification':
      return <VerificationStep onComplete={handleVerificationComplete} />;
    case 'messaging':
      return <MessagingStep matchId={selectedMatchId!} onDashboard={handleGoToDashboard} />;
    default:
      return null;
  }
}
