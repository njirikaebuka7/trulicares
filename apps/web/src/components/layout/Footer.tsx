import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';
import logoImg from '@/assets/logo.png';

const socialLinks = [
  {
    label: 'Facebook',
    href: '#',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
  },
  {
    label: 'Twitter / X',
    href: '#',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: '#',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.01" fill="currentColor" strokeWidth="3" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: '#',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand — spans 2 cols on lg */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center mb-5">
              <img
                src={logoImg}
                alt="TruliCares"
                className="h-9 w-auto brightness-0 invert opacity-90"
              />
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-xs">
              A trusted care marketplace connecting families with verified caregivers.
              Built on trust, transparency, and thoughtful matching.
            </p>
            {/* Social links */}
            <div className="flex items-center gap-2">
              {socialLinks.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="w-9 h-9 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-4">Navigation</h4>
            <ul className="space-y-3">
              {[
                { label: 'About', to: '/about' },
                { label: 'Services', to: '/services' },
                { label: 'Resources', to: '/resources' },
                { label: 'Contact', to: '/contact' },
              ].map(link => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm text-gray-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li className="pt-1 border-t border-gray-800">
                <Link to="/find-care" className="text-sm text-gray-300 hover:text-white font-medium transition-colors">
                  Find Care →
                </Link>
              </li>
              <li>
                <Link to="/provide-care" className="text-sm text-gray-300 hover:text-white font-medium transition-colors">
                  Become a Caregiver →
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-4">Services</h4>
            <ul className="space-y-3">
              {['Child Care', 'Senior Care', 'Adult Care', 'Cleaning Services'].map(service => (
                <li key={service}>
                  <Link to="/services" className="text-sm text-gray-400 hover:text-white transition-colors">
                    {service}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-4">Contact</h4>
            <ul className="space-y-3">
              <li>
                <a href="mailto:hello@trulicares.com" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                  <Mail className="w-4 h-4 text-gray-600 shrink-0" />
                  hello@trulicares.com
                </a>
              </li>
              <li>
                <a href="tel:5551234567" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                  <Phone className="w-4 h-4 text-gray-600 shrink-0" />
                  (555) 123-4567
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-400">
                <MapPin className="w-4 h-4 text-gray-600 shrink-0" />
                New York, NY
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} TruliCares. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link to="/privacy-policy" className="text-xs text-gray-600 hover:text-gray-300 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-xs text-gray-600 hover:text-gray-300 transition-colors">Terms of Service</Link>
            <Link to="/cookie-policy" className="text-xs text-gray-600 hover:text-gray-300 transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
