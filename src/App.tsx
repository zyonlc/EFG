import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import SignUp from './pages/SignUp';
import SignIn from './pages/SignIn';
import Dashboard from './pages/Dashboard';
import Account from './pages/Account';
import FeedPage from './pages/FeedPage';
import Media from './pages/Media';
import Masterclass from './pages/Masterclass';
import CourseDetailPage from './pages/CourseDetailPage';
import CareerGuidancePage from './pages/CareerGuidancePage';
import EnrollmentCallback from './pages/EnrollmentCallback';
import MembershipCallback from './pages/MembershipCallback';
import Content from './pages/Content';
import Events from './pages/Events';
import Portfolio from './pages/Portfolio';
import ViewCreatorPortfolio from './pages/ViewCreatorPortfolio';
import Projects from './pages/Projects';
import HelpCenter from './pages/HelpCenter';
import CreatorsMembership from './pages/CreatorsMembership';
import MembersMembership from './pages/MembersMembership';
import Connect from './pages/Connect';
import Settings from './pages/Settings';
import Books from './pages/Books';
import BooksCallback from './pages/BooksCallback';

// EMPOWISE CONTRACTOR ROUTES (New)
import ContractorOnboarding from './pages/ContractorOnboarding';
import CompanyProfile from './pages/CompanyProfile';
import Tenders from './pages/Tenders';
import Contracts from './pages/Contracts';
import ContractsEnhanced from './pages/ContractsEnhanced';
import ContractDetails from './pages/ContractDetails';
import ComplianceVault from './pages/ComplianceVault';
import MilestoneVerification from './pages/MilestoneVerification';
import ProfessionalDirectory from './pages/ProfessionalDirectory';
import Supplies from './pages/Supplies';
import SystemStatus from './pages/SystemStatus';
import ProjectsManagement from './pages/ProjectsManagement';
import ProjectsEnhanced from './pages/ProjectsEnhanced';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-xl font-medium text-slate-700">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
}

function ContractorProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [contractorExists, setContractorExists] = useState<boolean | null>(null);

  useEffect(() => {
    if (user && !loading) {
      checkContractorProfile();
    }
  }, [user, loading]);

  const checkContractorProfile = async () => {
    const { data } = await supabase
      .from('contractor_profiles')
      .select('id')
      .eq('user_id', user?.id)
      .maybeSingle();
    setContractorExists(!!data);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-xl font-medium text-slate-700">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // While checking contractor status, return nothing (silently check)
  if (contractorExists === null) {
    return null;
  }

  // If contractor doesn't exist, redirect to onboarding
  if (!contractorExists) {
    return <Navigate to="/onboarding" replace />;
  }

  // Contractor exists, show the page
  return <>{children}</>;
}

function App() {
  const { loading } = useAuth();

  useEffect(() => {
    // Pre-load Mux Player script for seamless video playback
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mux/mux-player';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-xl font-medium text-slate-700">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signin" element={<SignIn />} />
        <Route
          path="/dashboard"
          element={
            <ContractorProtectedRoute>
              <Dashboard />
            </ContractorProtectedRoute>
          }
        />
        <Route
          path="/feed"
          element={
            <ProtectedRoute>
              <FeedPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <Account />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        {/* Media and Content routes */}
        <Route path="/media" element={<Media />} />
        <Route
          path="/content"
          element={
            <ProtectedRoute>
              <Content />
            </ProtectedRoute>
          }
        />
        {/* Masterclass routes */}
        <Route path="/masterclass" element={<Masterclass />} />
        <Route path="/course/:courseId" element={<CourseDetailPage />} />
        <Route path="/career-guidance/:courseId" element={<CareerGuidancePage />} />
        <Route path="/enrollment-callback" element={<EnrollmentCallback />} />
        <Route path="/membership-callback" element={<MembershipCallback />} />
        {/* Help Center route */}
        <Route path="/help-center" element={<HelpCenter />} />
        {/* Events route */}
        <Route path="/events" element={<Events />} />
        {/* Portfolio routes */}
        <Route
          path="/portfolio"
          element={
            <ProtectedRoute>
              <Portfolio />
            </ProtectedRoute>
          }
        />
        <Route path="/portfolio/:creatorId" element={<ViewCreatorPortfolio />} />
        {/* DEPRECATED: Old Projects page - kept for reference but not used. The new Projects Management page will replace this. */}
        {/* <Route path="/projects" element={<Projects />} /> */}
        {/* Membership routes - creator and member */}
        <Route
          path="/creators-membership"
          element={
            <ProtectedRoute>
              <CreatorsMembership />
            </ProtectedRoute>
          }
        />
        <Route
          path="/members-membership"
          element={
            <ProtectedRoute>
              <MembersMembership />
            </ProtectedRoute>
          }
        />
        <Route path="/settings" element={<LandingPage />} />
        <Route
          path="/connect"
          element={
            <ProtectedRoute>
              <Connect />
            </ProtectedRoute>
          }
        />
        {/* Books routes - Zoho Books integration */}
        <Route
          path="/books"
          element={
            <ProtectedRoute>
              <Books />
            </ProtectedRoute>
          }
        />
        <Route path="/books/callback" element={<BooksCallback />} />
        <Route path="/profile" element={<LandingPage />} />

        {/* ============================================================================ */}
        {/* EMPOWISE CONTRACTOR PLATFORM ROUTES (NEW) */}
        {/* ============================================================================ */}

        {/* Onboarding - First time contractor setup */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <ContractorOnboarding />
            </ProtectedRoute>
          }
        />

        {/* Tenders & Bidding */}
        <Route
          path="/tenders"
          element={
            <ContractorProtectedRoute>
              <Tenders />
            </ContractorProtectedRoute>
          }
        />

        {/* Contract Management - List and Details */}
        <Route
          path="/contracts"
          element={
            <ContractorProtectedRoute>
              <ContractsEnhanced />
            </ContractorProtectedRoute>
          }
        />
        <Route
          path="/contracts/:contractId"
          element={
            <ContractorProtectedRoute>
              <ContractDetails />
            </ContractorProtectedRoute>
          }
        />

        {/* Compliance & Documents Vault */}
        <Route
          path="/compliance"
          element={
            <ContractorProtectedRoute>
              <ComplianceVault />
            </ContractorProtectedRoute>
          }
        />

        {/* Professional Network & Directory - HIDDEN FROM NAV (but route available for future use) */}
        {/* <Route
          path="/directory"
          element={
            <ContractorProtectedRoute>
              <ProfessionalDirectory />
            </ContractorProtectedRoute>
          }
        /> */}

        {/* Supplies Marketplace - HIDDEN FROM NAV (but route available for future use) */}
        {/* <Route
          path="/supplies"
          element={
            <ProtectedRoute>
              <Supplies />
            </ProtectedRoute>
          }
        /> */}

        {/* Projects Management - Completed and Ongoing Projects */}
        <Route
          path="/projects"
          element={
            <ContractorProtectedRoute>
              <ProjectsEnhanced />
            </ContractorProtectedRoute>
          }
        />

        {/* Company Profile Management */}
        <Route
          path="/company-profile"
          element={
            <ContractorProtectedRoute>
              <CompanyProfile />
            </ContractorProtectedRoute>
          }
        />

        {/* System Status (for testing/debugging) */}
        <Route
          path="/system-status"
          element={
            <ProtectedRoute>
              <SystemStatus />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
