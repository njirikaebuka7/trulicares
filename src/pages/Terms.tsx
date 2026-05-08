import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const sections = [
  {
    title: 'Acceptance of Terms',
    content: `By accessing or using TruliCares, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, you may not use our services. We reserve the right to modify these terms at any time, and your continued use of the platform constitutes acceptance of any changes.`,
  },
  {
    title: 'Description of Services',
    content: `TruliCares is an online marketplace that connects families seeking care services with independent caregivers. We facilitate the connection between these parties but are not an employer of caregivers, nor are we responsible for the actions of families or caregivers using our platform.\n\nOur services include: child care matching, senior care matching, adult care matching, cleaning service matching, in-app messaging, payment processing facilitation, and identity verification tools.`,
  },
  {
    title: 'User Accounts',
    content: `To use TruliCares, you must create an account and provide accurate, complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must be at least 18 years old to create an account. TruliCares reserves the right to suspend or terminate accounts that violate these terms.`,
  },
  {
    title: 'Caregiver Terms',
    content: `Caregivers using TruliCares are independent contractors, not employees of TruliCares. Caregivers are responsible for their own taxes, insurance, and compliance with applicable laws. Caregivers agree to provide accurate information about their qualifications, experience, and background. Misrepresentation of qualifications is grounds for immediate account termination.`,
  },
  {
    title: 'Family Terms',
    content: `Families using TruliCares are responsible for selecting caregivers who meet their needs. TruliCares provides verification tools but does not guarantee the suitability of any caregiver. Families agree to treat caregivers with respect and to pay agreed-upon rates promptly. Families are responsible for complying with applicable employment laws when directly hiring caregivers.`,
  },
  {
    title: 'Payments & Fees',
    content: `TruliCares charges a match-unlock fee to connect families with caregivers. This fee is non-refundable once messaging has been unlocked. Caregiver rates are set by the caregiver and paid directly by the family. TruliCares is not responsible for disputes between families and caregivers regarding payment for services rendered.`,
  },
  {
    title: 'Prohibited Conduct',
    content: `You agree not to: use the platform for any unlawful purpose; harass, abuse, or harm other users; provide false information or impersonate others; attempt to circumvent our fee structure by taking connections off-platform during initial matching; use automated tools to access or scrape our platform; or interfere with the proper operation of TruliCares.`,
  },
  {
    title: 'Limitation of Liability',
    content: `TruliCares shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service. Our total liability to you for any claims arising from use of the platform shall not exceed the amount you paid us in the twelve months preceding the claim.`,
  },
  {
    title: 'Contact',
    content: `For questions about these Terms, contact us at:\n\nTruliCares Legal Team\nhello@trulicares.com\n(555) 123-4567`,
  },
];

export default function Terms() {
  return (
    <div className="bg-white min-h-screen">
      <div className="bg-gradient-to-br from-brand-900 to-brand-950 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center gap-2 text-brand-300 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Terms of Service</h1>
          <p className="text-brand-300 text-sm">Last updated: January 1, 2025</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 text-base leading-relaxed mb-10">
            Please read these Terms of Service carefully before using the TruliCares platform. These terms govern your access to and use of our website, mobile applications, and services.
          </p>
          <div className="space-y-10">
            {sections.map((section, i) => (
              <div key={i}>
                <h2 className="text-xl font-bold text-gray-900 mb-3">{section.title}</h2>
                {section.content.split('\n\n').map((para, j) => (
                  <p key={j} className="text-gray-600 text-sm leading-relaxed mb-3 whitespace-pre-line">
                    {para}
                  </p>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-12 pt-8 border-t border-gray-100 flex flex-wrap gap-4">
            <Link to="/privacy-policy" className="text-brand-600 hover:underline text-sm font-medium">Privacy Policy</Link>
            <Link to="/cookie-policy" className="text-brand-600 hover:underline text-sm font-medium">Cookie Policy</Link>
            <Link to="/contact" className="text-brand-600 hover:underline text-sm font-medium">Contact Us</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
