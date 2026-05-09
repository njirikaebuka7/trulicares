import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const cookieTypes = [
  {
    name: 'Strictly Necessary Cookies',
    description: 'These cookies are essential for the website to function. They enable core functionality such as security, network management, and accessibility. You cannot opt out of these cookies.',
    examples: ['Session cookies', 'Authentication tokens', 'CSRF protection'],
  },
  {
    name: 'Performance Cookies',
    description: 'These cookies collect information about how visitors use our site, such as which pages are visited most often. All information these cookies collect is aggregated and anonymous.',
    examples: ['Analytics cookies', 'Error tracking', 'Load time monitoring'],
  },
  {
    name: 'Functionality Cookies',
    description: 'These cookies allow the site to remember choices you make (such as your username or language) and provide enhanced, more personal features.',
    examples: ['Language preferences', 'Location settings', 'Notification preferences'],
  },
  {
    name: 'Targeting / Marketing Cookies',
    description: 'These cookies may be set through our site by our advertising partners to build a profile of your interests and show you relevant adverts on other sites. You can opt out through your browser settings.',
    examples: ['Retargeting pixels', 'Social media buttons', 'Interest-based advertising'],
  },
];

export default function CookiePolicy() {
  return (
    <div className="bg-white min-h-screen">
      <div className="bg-gradient-to-br from-brand-900 to-brand-950 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center gap-2 text-brand-300 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Cookie Policy</h1>
          <p className="text-brand-300 text-sm">Last updated: January 1, 2025</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-gray-600 text-base leading-relaxed mb-10">
          TruliCares uses cookies and similar technologies to help personalize content, tailor and measure ads, and provide a better experience. By using our platform, you agree to the use of cookies as described in this policy.
        </p>

        <div className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-3">What Are Cookies?</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Cookies are small text files that are stored on your computer or mobile device when you visit a website. They allow the website to recognize your device and remember information about your visit, such as your login status and preferences.
          </p>
        </div>

        <div className="space-y-6 mb-12">
          <h2 className="text-xl font-bold text-gray-900">Types of Cookies We Use</h2>
          {cookieTypes.map((type, i) => (
            <div key={i} className="bg-gray-50 rounded-2xl p-6">
              <h3 className="font-bold text-gray-900 mb-2">{type.name}</h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">{type.description}</p>
              <div className="flex flex-wrap gap-2">
                {type.examples.map((ex, j) => (
                  <span key={j} className="text-xs px-3 py-1 bg-white border border-gray-200 rounded-full text-gray-600 font-medium">
                    {ex}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Managing Cookies</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-3">
            Most web browsers allow some control of most cookies through the browser settings. To find out more about cookies, including how to see what cookies have been set and how to manage and delete them, visit <a href="https://www.aboutcookies.org" className="text-brand-600 hover:underline" target="_blank" rel="noopener noreferrer">www.aboutcookies.org</a>.
          </p>
          <p className="text-gray-600 text-sm leading-relaxed">
            Please note that if you disable cookies, some features of TruliCares may not function correctly, including the ability to log in, access your dashboard, and manage your care preferences.
          </p>
        </div>

        <div className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Contact Us</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            If you have questions about our cookie policy, please contact us at hello@trulicares.com or through our{' '}
            <Link to="/contact" className="text-brand-600 hover:underline">Contact page</Link>.
          </p>
        </div>

        <div className="pt-8 border-t border-gray-100 flex flex-wrap gap-4">
          <Link to="/privacy-policy" className="text-brand-600 hover:underline text-sm font-medium">Privacy Policy</Link>
          <Link to="/terms" className="text-brand-600 hover:underline text-sm font-medium">Terms of Service</Link>
          <Link to="/contact" className="text-brand-600 hover:underline text-sm font-medium">Contact Us</Link>
        </div>
      </div>
    </div>
  );
}
