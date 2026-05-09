import HeroSection from '@/components/home/HeroSection';
import ServicesSection from '@/components/home/ServicesSection';
import HowItWorks from '@/components/home/HowItWorks';
import TrustSafety from '@/components/home/TrustSafety';
import CaregiverSection from '@/components/home/CaregiverSection';
import WhyChoose from '@/components/home/WhyChoose';
import Testimonials from '@/components/home/Testimonials';
import FinalCTA from '@/components/home/FinalCTA';

export default function Home() {
  return (
    <>
      <HeroSection />
      <ServicesSection />
      <HowItWorks />
      <TrustSafety />
      <CaregiverSection />
      <WhyChoose />
      <Testimonials />
      <FinalCTA />
    </>
  );
}
