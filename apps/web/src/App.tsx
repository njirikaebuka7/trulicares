import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import ScrollToTop from '@/components/ScrollToTop';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import Home from '@/pages/Home';
import About from '@/pages/About';
import Services from '@/pages/Services';
import Resources from '@/pages/Resources';
import Contact from '@/pages/Contact';
import FindCare from '@/pages/FindCare';
import ProvideCare from '@/pages/ProvideCare';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import Terms from '@/pages/Terms';
import CookiePolicy from '@/pages/CookiePolicy';
import ResourceArticle from '@/pages/ResourceArticle';
import CaregiverProfile from '@/pages/CaregiverProfile';
import CaregiverList from '@/pages/CaregiverList';
import ResetPassword from '@/pages/ResetPassword';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* Pages with standard layout (navbar + footer) */}
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/resources/:id" element={<ResourceArticle />} />
            <Route path="/caregivers" element={
              <ProtectedRoute requiredRole="family">
                <CaregiverList />
              </ProtectedRoute>
            } />
            <Route path="/caregivers/:id" element={
              <ProtectedRoute requiredRole="family">
                <CaregiverProfile />
              </ProtectedRoute>
            } />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />
          </Route>

          {/* Full-screen flows (no navbar/footer) */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/find-care" element={<FindCare />} />
          <Route path="/provide-care" element={<ProvideCare />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
