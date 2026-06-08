import HeroSection from '@/components/home/HeroSection';
import ServicesSection from '@/components/home/ServicesSection';
import TopCaregivers from '@/components/home/TopCaregivers';
import HowItWorks from '@/components/home/HowItWorks';
import TrustSafety from '@/components/home/TrustSafety';
import CaregiverSection from '@/components/home/CaregiverSection';
import HealthcareStaffing from '@/components/home/HealthcareStaffing';
import WhyChoose from '@/components/home/WhyChoose';
import Testimonials from '@/components/home/Testimonials';
import FinalCTA from '@/components/home/FinalCTA';
import Seo, { SITE_URL, organizationSchema } from '@/components/Seo';

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'TruliCares',
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/caregivers?search={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

export default function Home() {
  return (
    <>
      <Seo
        title="TruliCares — Find Trusted, Verified Caregivers & Healthcare Staffing"
        description="TruliCares helps families find verified caregivers for child, senior, and adult care, and helps healthcare facilities hire licensed professionals."
        path="/"
        jsonLd={[organizationSchema, websiteSchema]}
      />
      <HeroSection />
      <ServicesSection />
      <TopCaregivers />
      <HowItWorks />
      <TrustSafety />
      <CaregiverSection />
      <HealthcareStaffing />
      <WhyChoose />
      <Testimonials />
      <FinalCTA />
    </>
  );
}
