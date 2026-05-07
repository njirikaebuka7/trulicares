import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { CareCategory } from '@/types';

// Step components
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

export default function FindCare() {
  const location = useLocation();
  const navigate = useNavigate();
  const preselected = (location.state as { preselectedCategory?: string })?.preselectedCategory;

  const [phase, setPhase] = useState<FlowPhase>('care-type');
  const [careCategory, setCareCategory] = useState<CareCategory | null>(null);
  const [careData, setCareData] = useState<Record<string, unknown>>({});
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

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
    setPhase('account');
  };

  const handleAccountComplete = () => {
    setPhase('review');
  };

  const handleSubmitReview = () => {
    setPhase('matching');
  };

  const handleMatchingComplete = () => {
    setPhase('matches');
  };

  const handleSelectMatch = (matchId: string) => {
    setSelectedMatchId(matchId);
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
      return <CareTypeStep onSelect={handleCareTypeSelect} />;
    case 'care-details':
      if (!careCategory) return null;
      switch (careCategory) {
        case 'child-care':
          return <ChildCareFlow onComplete={handleCareDetailsComplete} onBack={() => setPhase('care-type')} />;
        case 'senior-care':
          return <SeniorCareFlow onComplete={handleCareDetailsComplete} onBack={() => setPhase('care-type')} />;
        case 'adult-care':
          return <AdultCareFlow onComplete={handleCareDetailsComplete} onBack={() => setPhase('care-type')} />;
        case 'cleaning':
          return <CleaningFlow onComplete={handleCareDetailsComplete} onBack={() => setPhase('care-type')} />;
        default:
          return null;
      }
    case 'account':
      return <AccountStep onComplete={handleAccountComplete} onBack={() => setPhase('care-details')} />;
    case 'review':
      return <ReviewStep careCategory={careCategory!} careData={careData} onSubmit={handleSubmitReview} onBack={() => setPhase('account')} />;
    case 'matching':
      return <MatchingStep onComplete={handleMatchingComplete} />;
    case 'matches':
      return <MatchesListStep onSelectMatch={handleSelectMatch} />;
    case 'payment':
      return <PaymentStep matchId={selectedMatchId!} onComplete={handlePaymentComplete} onBack={() => setPhase('matches')} />;
    case 'verification':
      return <VerificationStep onComplete={handleVerificationComplete} />;
    case 'messaging':
      return <MessagingStep matchId={selectedMatchId!} onDashboard={handleGoToDashboard} />;
    default:
      return null;
  }
}
