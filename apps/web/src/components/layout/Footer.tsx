import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';
import logoImg from '@/assets/logo.png';
import { siteSettings, type PublicSettings } from '@/lib/api';
import { FacebookIcon, InstagramIcon, YoutubeIcon } from '@/components/icons/social';

const FALLBACK: PublicSettings = {
  platformName: 'TruliCares',
  socials: {
    facebook: 'https://facebook.com/trulicares',
    instagram: 'https://instagram.com/trulicares',
    youtube: 'https://youtube.com/@trulicares',
  },
  emails: ['hello@trulicares.com'],
  phones: ['(555) 123-4567'],
  addresses: ['New York, NY'],
};

const telHref = (p: string) => `tel:${p.replace(/[^\d+]/g, '')}`;

export default function Footer() {
  const [settings, setSettings] = useState<PublicSettings>(FALLBACK);

  useEffect(() => {
    siteSettings.getPublic().then((s) => setSettings({ ...FALLBACK, ...s })).catch(() => {});
  }, []);

  const socialLinks = [
    { label: 'Facebook', href: settings.socials.facebook, icon: <FacebookIcon className="w-4 h-4" /> },
    { label: 'Instagram', href: settings.socials.instagram, icon: <InstagramIcon className="w-4 h-4" /> },
    { label: 'YouTube', href: settings.socials.youtube, icon: <YoutubeIcon className="w-4 h-4" /> },
  ].filter((s) => s.href && s.href.trim());

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
            <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-sm">
              TruliCares is a trusted care marketplace connecting families with verified,
              background-checked caregivers for child, senior, and adult care — and staffing
              healthcare facilities with licensed nursing professionals on demand. Built on
              trust, transparency, and thoughtful matching across the United States.
            </p>
            {/* Social links */}
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-2">
                {socialLinks.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="w-9 h-9 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            )}
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
              <li>
                <Link to="/for-facilities" className="text-sm text-gray-300 hover:text-white font-medium transition-colors">
                  For Facilities →
                </Link>
              </li>
              <li>
                <Link to="/for-professionals" className="text-sm text-gray-300 hover:text-white font-medium transition-colors">
                  For Professionals →
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
              <li className="pt-1 border-t border-gray-800">
                <Link to="/locations" className="text-sm text-gray-300 hover:text-white font-medium transition-colors">
                  Find Caregivers Near You →
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-4">Contact</h4>
            <ul className="space-y-3">
              {settings.emails.map((email) => (
                <li key={email}>
                  <a href={`mailto:${email}`} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                    <Mail className="w-4 h-4 text-gray-600 shrink-0" />
                    {email}
                  </a>
                </li>
              ))}
              {settings.phones.map((phone) => (
                <li key={phone}>
                  <a href={telHref(phone)} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                    <Phone className="w-4 h-4 text-gray-600 shrink-0" />
                    {phone}
                  </a>
                </li>
              ))}
              {settings.addresses.map((address) => (
                <li key={address} className="flex items-start gap-2 text-sm text-gray-400">
                  <MapPin className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" />
                  {address}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} {settings.platformName || 'TruliCares'}. All rights reserved.
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
