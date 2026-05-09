import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const sections = [
  {
    title: 'Information We Collect',
    content: `We collect information you provide directly to us, such as when you create an account, submit a care request, or contact us for support. This includes your name, email address, phone number, location, and any other information you choose to provide.\n\nWe also automatically collect certain information when you use our services, including log data, device information, usage data, and cookies and similar tracking technologies.`,
  },
  {
    title: 'How We Use Your Information',
    content: `We use the information we collect to provide, maintain, and improve our services; process care requests and match families with caregivers; send transactional and promotional communications; monitor and analyze trends and usage; detect and prevent fraudulent transactions and other illegal activities; and comply with legal obligations.`,
  },
  {
    title: 'Information Sharing',
    content: `We do not sell, trade, or rent your personal information to third parties. We may share your information with caregivers or families as part of the matching process (only with your consent), service providers who assist us in operating our platform, law enforcement or government agencies when required by law, and in connection with a merger, acquisition, or sale of assets.`,
  },
  {
    title: 'Data Security',
    content: `We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access. All data is transmitted over encrypted connections (TLS/SSL). We regularly review our security practices and update them as necessary to address emerging threats.`,
  },
  {
    title: 'Your Rights & Choices',
    content: `You may update or correct your account information at any time by logging into your account settings. You may opt out of promotional emails by following the unsubscribe instructions in those emails. You may request deletion of your account and associated data by contacting us at privacy@trulicares.com. Depending on your jurisdiction, you may have additional rights under applicable data protection laws.`,
  },
  {
    title: 'Cookies',
    content: `We use cookies and similar tracking technologies to track activity on our service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our service.`,
  },
  {
    title: 'Children\'s Privacy',
    content: `Our service is not directed to children under the age of 13. We do not knowingly collect personally identifiable information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.`,
  },
  {
    title: 'Contact Us',
    content: `If you have any questions about this Privacy Policy, please contact us at:\n\nTruliCares\nhello@trulicares.com\n(555) 123-4567\nNew York, NY`,
  },
];

export default function PrivacyPolicy() {
  return (
    <div className="bg-white min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-900 to-brand-950 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center gap-2 text-brand-300 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Privacy Policy</h1>
          <p className="text-brand-300 text-sm">Last updated: January 1, 2025</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 text-base leading-relaxed mb-10">
            TruliCares ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our care marketplace platform.
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
            <Link to="/terms" className="text-brand-600 hover:underline text-sm font-medium">Terms of Service</Link>
            <Link to="/cookie-policy" className="text-brand-600 hover:underline text-sm font-medium">Cookie Policy</Link>
            <Link to="/contact" className="text-brand-600 hover:underline text-sm font-medium">Contact Us</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
