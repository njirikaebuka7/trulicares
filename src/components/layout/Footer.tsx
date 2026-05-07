import { Link } from 'react-router-dom';
import { Heart, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-brand-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" fill="white" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                Truli<span className="text-brand-400">Cares</span>
              </span>
            </Link>
            <p className="text-brand-300 text-sm leading-relaxed">
              A trusted care marketplace connecting families with verified caregivers. 
              Built on trust, transparency, and thoughtful matching.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-brand-400 mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {['About', 'Services', 'Resources', 'Contact'].map(link => (
                <li key={link}>
                  <Link to={`/${link.toLowerCase()}`} className="text-sm text-brand-200 hover:text-white transition-colors">
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-brand-400 mb-4">Services</h4>
            <ul className="space-y-3">
              {['Child Care', 'Senior Care', 'Adult Care', 'Cleaning Services'].map(service => (
                <li key={service}>
                  <Link to="/services" className="text-sm text-brand-200 hover:text-white transition-colors">
                    {service}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-brand-400 mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-brand-200">
                <Mail className="w-4 h-4 text-brand-400" />
                hello@trulicares.com
              </li>
              <li className="flex items-center gap-2 text-sm text-brand-200">
                <Phone className="w-4 h-4 text-brand-400" />
                (555) 123-4567
              </li>
              <li className="flex items-center gap-2 text-sm text-brand-200">
                <MapPin className="w-4 h-4 text-brand-400" />
                New York, NY
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-brand-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-brand-400">
            © {new Date().getFullYear()} TruliCares. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-brand-400 hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="text-xs text-brand-400 hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="text-xs text-brand-400 hover:text-white transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
