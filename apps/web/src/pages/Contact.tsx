import { useEffect, useState } from 'react';
import { Mail, Phone, MapPin, MessageCircle, Send, Clock, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import { support, siteSettings, type PublicSettings } from '@/lib/api';
import Seo from '@/components/Seo';

const telHref = (p: string) => `tel:${p.replace(/[^\d+]/g, '')}`;

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<PublicSettings | null>(null);

  useEffect(() => {
    siteSettings.getPublic().then(setSettings).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await support.createTicket(formData);
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to send your message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const emails = settings?.emails?.length ? settings.emails : ['hello@trulicares.com'];
  const phones = settings?.phones?.length ? settings.phones : ['(555) 123-4567'];
  const addresses = settings?.addresses?.length ? settings.addresses : ['New York, NY'];

  const contactInfo = [
    ...emails.map((value, i) => ({
      icon: <Mail className="w-5 h-5" />, label: i === 0 ? 'Email' : 'Email (alt)', value, href: `mailto:${value}`,
    })),
    ...phones.map((value, i) => ({
      icon: <Phone className="w-5 h-5" />, label: i === 0 ? 'Phone' : 'Phone (alt)', value, href: telHref(value),
    })),
    ...addresses.map((value, i) => ({
      icon: <MapPin className="w-5 h-5" />, label: i === 0 ? 'Address' : 'Address (alt)', value, href: '#',
    })),
    { icon: <Clock className="w-5 h-5" />, label: 'Hours', value: 'Mon-Fri: 9am-6pm EST', href: '#' },
  ];

  return (
    <div className="bg-white">
      <Seo
        title="Contact TruliCares — We're Here to Help"
        description="Get in touch with the TruliCares team. Questions about finding care, becoming a caregiver, or staffing your facility? Reach us by email or phone."
        path="/contact"
      />
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full glass text-brand-200 text-sm font-semibold mb-6">
            Contact Us
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            We're here to{' '}
            <span className="bg-gradient-to-r from-brand-300 to-coral-400 bg-clip-text text-transparent">help</span>
          </h1>
          <p className="text-lg text-brand-200 max-w-2xl mx-auto leading-relaxed">
            Have questions or need assistance? Our team is ready to support you.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Contact info */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Get in touch</h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Whether you have questions about our services, need help with your account, or want to provide feedback — we'd love to hear from you.
              </p>

              <div className="space-y-4 mb-10">
                {contactInfo.map((item, i) => (
                  <a
                    key={i}
                    href={item.href}
                    className="flex items-start gap-4 p-4 rounded-2xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600 shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <span className="block text-sm text-gray-500">{item.label}</span>
                      <span className="block font-semibold text-gray-900">{item.value}</span>
                    </div>
                  </a>
                ))}
              </div>

              {/* Quick help */}
              <div className="bg-gradient-to-br from-brand-50 to-warm-50 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <MessageCircle className="w-5 h-5 text-brand-600" />
                  <span className="font-semibold text-gray-900">Need immediate help?</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Check our Resources section for FAQs, guides, and helpful articles.
                </p>
                <a href="/resources" className="text-sm font-semibold text-brand-600 hover:underline">
                  View Resources →
                </a>
              </div>
            </div>

            {/* Contact form */}
            <div>
              {submitted ? (
                <div className="bg-brand-50 rounded-3xl p-8 text-center">
                  <div className="w-16 h-16 bg-brand-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Message sent!</h3>
                  <p className="text-gray-600">
                    Thank you for reaching out. We'll get back to you within 24 hours.
                  </p>
                  <Button
                    variant="secondary"
                    size="md"
                    className="mt-6"
                    onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', subject: '', message: '' }); }}
                  >
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-200 p-6 lg:p-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Send us a message</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Your name</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
                        placeholder="you@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                      <select
                        required
                        value={formData.subject}
                        onChange={e => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
                      >
                        <option value="">Select a topic</option>
                        <option value="general">General Inquiry</option>
                        <option value="support">Account Support</option>
                        <option value="billing">Billing Question</option>
                        <option value="feedback">Feedback</option>
                        <option value="partnership">Partnership</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                      <textarea
                        required
                        rows={4}
                        value={formData.message}
                        onChange={e => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none resize-none"
                        placeholder="How can we help you?"
                      />
                    </div>

                    {error && (
                      <p className="text-sm text-red-600 font-medium">{error}</p>
                    )}
                    <Button
                      type="submit"
                      variant="primary"
                      size="xl"
                      fullWidth
                      loading={loading}
                      icon={<Send className="w-5 h-5" />}
                    >
                      Send Message
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
