import { useEffect, useState, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import TalentUnit from "./pages/TalentUnit";
import SourcingTool from "./pages/SourcingTool";
import DatabaseSearchTool from "./pages/DatabaseSearchTool";
import CandidateDatabase from "./pages/CandidateDatabase";
import CVUpload from "./pages/CVUpload";
import ExternalSourcing from "./pages/ExternalSourcing";
import FindCandidates from "./pages/FindCandidates";
import TalentNetwork from "./pages/TalentNetwork";
import Settings from "./pages/Settings";
import Proposals from "./pages/Proposals";
import ProposalView from "./pages/ProposalView";
import ProcureAIProposal from "./pages/ProcureAIProposal";
import ProcureAIProposalV2 from "./pages/ProcureAIProposalV2";
import ProcureAIExecutivePack from "./pages/ProcureAIExecutivePack";
import ProcureAIExecutivePackV3 from "./pages/ProcureAIExecutivePackV3";
import ProcureAIExecutivePackV4 from "./pages/ProcureAIExecutivePackV4";
import ProcureAIScrollPresentation from "./pages/ProcureAIScrollPresentation";

// Business Unit Pages
import SalesAndBD from "./pages/SalesAndBD";
import MarketingAndBrand from "./pages/MarketingAndBrand";
import AdvisoryAndConsulting from "./pages/AdvisoryAndConsulting";
import TechnologyAndBuild from "./pages/TechnologyAndBuild";
import OperationsAndFinance from "./pages/OperationsAndFinance";
import AcademyAndLearning from "./pages/AcademyAndLearning";
import ClientDelivery from "./pages/ClientDelivery";
import THCOHRPage from "./pages/THCOHRPage";
import ProjectManagement from "./pages/ProjectManagement";
import ITAndTools from "./pages/ITAndTools";

// THCO Flow — Project Management System (12-stage pipeline)
import FlowDashboard from "./pages/flow/FlowDashboard";
import FlowBoard from "./pages/flow/FlowBoard";
import FlowProjects from "./pages/flow/FlowProjects";
import FlowNewProject from "./pages/flow/FlowNewProject";
import FlowProjectDetail from "./pages/flow/FlowProjectDetail";
import FlowContacts from "./pages/flow/FlowContacts";
import FlowCalendar from "./pages/flow/FlowCalendar";
import FlowProspects from "./pages/flow/FlowProspects";
import FlowTickets from "./pages/flow/FlowTickets";
import FlowMessages from "./pages/flow/FlowMessages";
import FlowRolesAdmin from "./pages/flow/FlowRolesAdmin";

// FlowForge Pages
import FlowForgeChat from "./pages/FlowForgeChat";
import ApprovalQueue from "./pages/ApprovalQueue";

// Assessment Pages
import CandidateAssessment from "./pages/CandidateAssessment";
import AdminAssessments from "./pages/AdminAssessments";

// Project Delivery Workflow Pages
import ProjectFulfillment from "./pages/ProjectFulfillment";
import NewProjectForm from "./pages/NewProjectForm";
import DelegationBoard from "./pages/DelegationBoard";
import MyProjects from "./pages/MyProjects";
import ProjectReview from "./pages/ProjectReview";
import ProjectTracker from "./pages/ProjectTracker";
import UserManagement from "./pages/UserManagement";
import Profile from "./pages/Profile";
import Feedback from "./pages/Feedback";
import ITFeedbackConsole from "./pages/ITFeedbackConsole";
import BusinessUnitsAdmin from "./pages/BusinessUnitsAdmin";
import UnitPage from "./pages/UnitPage";
import { ThemeProvider } from "./context/ThemeContext";

// Presentations
import WinstonDukePresentation from "./pages/WinstonDukePresentation";

// Public Email-Gated Presentations
import ProcureAIExecutivePackPublic from "./pages/ProcureAIExecutivePackPublic";
import ProcureAIExecutivePackV3Public from "./pages/ProcureAIExecutivePackV3Public";
import ProcureAIProposalPublic from "./pages/ProcureAIProposalPublic";
import ProcureAIScrollPublic from "./pages/ProcureAIScrollPublic";
import ProcureAIProposalV1Public from "./pages/ProcureAIProposalV1Public";
import ProcureAITWGSession from "./pages/ProcureAITWGSession";
import ProcureAITWGSessionPublic from "./pages/ProcureAITWGSessionPublic";
import ProcureAITWGSlideshow from "./pages/ProcureAITWGSlideshow";
import ProcureAITWGSlideshowPublic from "./pages/ProcureAITWGSlideshowPublic";
import THCOTownHall2026V2 from "./pages/THCOTownHall2026V2";
import THCOTownHall2026V2Public from "./pages/THCOTownHall2026V2Public";
import ProcureAIGCIOPack from "./pages/ProcureAIGCIOPack";
import ProcureAIGCIOPackPublic from "./pages/ProcureAIGCIOPackPublic";
import SagicorProgressDashboard from "./pages/SagicorProgressDashboard";
import SagicorProgressDashboardPublic from "./pages/SagicorProgressDashboardPublic";
import AIBankingPresentation from "./pages/AIBankingPresentation";
import AIBankingPresentationPublic from "./pages/AIBankingPresentationPublic";
import PebblesBrandPresentation from "./pages/PebblesBrandPresentation";
import PebblesBrandPresentationPublic from "./pages/PebblesBrandPresentationPublic";
import ProcureAIEYPresentation from "./pages/ProcureAIEYPresentation";
import ProcureAIEYPresentationPublic from "./pages/ProcureAIEYPresentationPublic";
import ProcureAIMeetTheTeam from "./pages/ProcureAIMeetTheTeam";
import ProcureAIMeetTheTeamPublic from "./pages/ProcureAIMeetTheTeamPublic";
import GDLPebblesPresentation from "./pages/GDLPebblesPresentation";
import GDLPebblesPresentationPublic from "./pages/GDLPebblesPresentationPublic";
import IngaboPresentation from "./pages/IngaboPresentation";
import IngaboPresentationPublic from "./pages/IngaboPresentationPublic";
import TheForgePresentation from "./pages/TheForgePresentation";
import TheForgePresentationPublic from "./pages/TheForgePresentationPublic";
import TheForgeV2Presentation from "./pages/TheForgeV2Presentation";
import TheForgeV2PresentationPublic from "./pages/TheForgeV2PresentationPublic";
import TideWarPresentation from "./pages/TideWarPresentation";
import TideWarPresentationPublic from "./pages/TideWarPresentationPublic";
import SagicorSTECPresentation from "./pages/SagicorSTECPresentation";
import SagicorSTECPresentationPublic from "./pages/SagicorSTECPresentationPublic";
import ReallocPresentation from "./pages/ReallocPresentation";
import ReallocPresentationPublic from "./pages/ReallocPresentationPublic";
import ProcureAITeamPresentation from "./pages/ProcureAITeamPresentation";
import ProcureAITeamPresentationPublic from "./pages/ProcureAITeamPresentationPublic";
import AFCTreasuryPresentation from "./pages/AFCTreasuryPresentation";
import AFCTreasuryPresentationPublic from "./pages/AFCTreasuryPresentationPublic";

// Layout
import DashboardLayout from "./components/DashboardLayout";

// API
import { authAPI } from "./lib/api";
import { UserProvider, hasUnitAccess, canManageUsers } from "./context/UserContext";

// Auth Callback Component - handles OAuth redirect
const AuthCallback = () => {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const hash = window.location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (sessionIdMatch) {
        const sessionId = sessionIdMatch[1];
        try {
          const response = await authAPI.exchangeSession(sessionId);
          if (response.user_id) {
            navigate("/dashboard", { state: { user: response }, replace: true });
          } else {
            navigate("/login", { replace: true });
          }
        } catch (error) {
          console.error("Auth callback error:", error);
          navigate("/login", { replace: true });
        }
      } else {
        navigate("/login", { replace: true });
      }
    };

    processAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#0D0F1A] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#1FB58A] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-[#8B8AA0]">Authenticating...</p>
      </div>
    </div>
  );
};

// Elegant access-restricted screen (rendered inside the layout shell)
const AccessRestricted = () => (
  <div className="min-h-[60vh] flex items-center justify-center" data-testid="access-restricted">
    <div className="text-center max-w-md">
      <div className="w-14 h-14 mx-auto mb-6 rounded-full border border-[#C6A15B]/40 flex items-center justify-center">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C6A15B" strokeWidth="1.5">
          <rect x="4" y="10" width="16" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#C6A15B] mb-3">Restricted</p>
      <h2 className="font-display text-2xl text-gray-900 mb-3">This area is not part of your access</h2>
      <p className="text-sm text-gray-500 mb-8 leading-relaxed">
        Your account has not been granted access to this unit. If you believe you need it,
        ask your administrator or HR to extend your permissions.
      </p>
      <a href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 border-b border-[#C6A15B] pb-0.5 hover:text-[#C6A15B] transition-colors">
        Return to Dashboard
      </a>
    </div>
  </div>
);

// Protected Route Component
// `unit`   — restrict to users with access to that unit slug
// `access` — "admin" (super_admin only) or "user-admin" (super_admin | mini_admin | HR)
const ProtectedRoute = ({ children, unit, access }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If user data passed from AuthCallback, use it
    if (location.state?.user) {
      setUser(location.state.user);
      setIsAuthenticated(true);
      return;
    }

    const checkAuth = async () => {
      try {
        const userData = await authAPI.getMe();
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
        navigate("/login", { replace: true });
      }
    };

    checkAuth();
  }, [navigate, location.state]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#0C0F13] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#C6A15B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#8a8f98]">THCO &middot; Loading</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  let allowed = true;
  if (unit) allowed = hasUnitAccess(user, unit);
  if (access === "admin") allowed = user?.role === "super_admin";
  if (access === "user-admin") allowed = canManageUsers(user);
  if (access === "hr") allowed = user?.role === "super_admin" || Boolean(user?.is_hr);
  if (access === "it") allowed = user?.role === "super_admin" || Boolean(user?.is_it) || (user?.accessible_units || []).includes("it-tools");

  return (
    <UserProvider user={user}>
      <DashboardLayout user={user}>{allowed ? children : <AccessRestricted />}</DashboardLayout>
    </UserProvider>
  );
};

// App Router Component
const AppRouter = () => {
  const location = useLocation();

  // Check URL fragment for session_id (OAuth callback) - must be synchronous
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Public Assessment */}
      <Route path="/assessment" element={<CandidateAssessment />} />
      
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/talent" element={
        <ProtectedRoute unit="talent">
          <TalentUnit />
        </ProtectedRoute>
      } />
      
      <Route path="/talent/sourcing" element={
        <ProtectedRoute unit="talent">
          <SourcingTool />
        </ProtectedRoute>
      } />
      
      <Route path="/talent/database-search" element={
        <ProtectedRoute unit="talent">
          <DatabaseSearchTool />
        </ProtectedRoute>
      } />

      <Route path="/talent/candidates" element={
        <ProtectedRoute unit="talent">
          <CandidateDatabase />
        </ProtectedRoute>
      } />

      <Route path="/talent/candidates/upload" element={
        <ProtectedRoute unit="talent">
          <CVUpload />
        </ProtectedRoute>
      } />

      <Route path="/talent/sourcing/external" element={
        <ProtectedRoute unit="talent">
          <ExternalSourcing />
        </ProtectedRoute>
      } />

      <Route path="/talent/find" element={
        <ProtectedRoute unit="talent">
          <FindCandidates />
        </ProtectedRoute>
      } />

      <Route path="/talent/network" element={
        <ProtectedRoute unit="talent">
          <TalentNetwork />
        </ProtectedRoute>
      } />

      <Route path="/talent/projects" element={
        <ProtectedRoute unit="talent">
          <ProjectFulfillment />
        </ProtectedRoute>
      } />
      <Route path="/talent/projects/new" element={
        <ProtectedRoute unit="talent">
          <NewProjectForm />
        </ProtectedRoute>
      } />

      <Route path="/thco-hr/delegation" element={
        <ProtectedRoute unit="thco-hr">
          <DelegationBoard />
        </ProtectedRoute>
      } />

      <Route path="/technology/my-projects" element={
        <ProtectedRoute unit="technology">
          <MyProjects />
        </ProtectedRoute>
      } />
      <Route path="/technology/my-projects/:id/review" element={
        <ProtectedRoute unit="technology">
          <ProjectReview />
        </ProtectedRoute>
      } />
      <Route path="/technology/my-projects/:id/tracker" element={
        <ProtectedRoute unit="technology">
          <ProjectTracker />
        </ProtectedRoute>
      } />

      <Route path="/admin/users" element={
        <ProtectedRoute access="user-admin">
          <UserManagement />
        </ProtectedRoute>
      } />
      
      <Route path="/settings" element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } />

      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />

      <Route path="/feedback" element={
        <ProtectedRoute>
          <Feedback />
        </ProtectedRoute>
      } />

      <Route path="/it-feedback" element={
        <ProtectedRoute access="it">
          <ITFeedbackConsole />
        </ProtectedRoute>
      } />

      <Route path="/admin/business-units" element={
        <ProtectedRoute access="admin">
          <BusinessUnitsAdmin />
        </ProtectedRoute>
      } />

      <Route path="/unit/:slug" element={
        <ProtectedRoute>
          <UnitPage />
        </ProtectedRoute>
      } />
      
      <Route path="/proposals" element={
        <ProtectedRoute>
          <Proposals />
        </ProtectedRoute>
      } />
      
      {/* Public Proposal View - No Auth Required */}
      <Route path="/proposals/view/:shareToken" element={<ProposalView />} />
      
      {/* Public Email-Gated Presentations */}
      <Route path="/proposals/procure-ai" element={<ProcureAIProposalPublic />} />
      <Route path="/proposals/procure-ai-executive" element={<ProcureAIExecutivePackPublic />} />
      <Route path="/proposals/procure-ai-executive-v3" element={<ProcureAIExecutivePackV3Public />} />
      <Route path="/proposals/procure-ai-scroll" element={<ProcureAIScrollPublic />} />
      <Route path="/proposals/procure-ai-v1" element={<ProcureAIProposalV1Public />} />
      <Route path="/proposals/procure-ai-twg" element={<ProcureAITWGSessionPublic />} />
      <Route path="/proposals/twg-slideshow" element={<ProcureAITWGSlideshowPublic />} />
      <Route path="/proposals/town-hall-2026" element={<THCOTownHall2026V2Public />} />
      <Route path="/proposals/gcio-pack" element={<ProcureAIGCIOPackPublic />} />
      <Route path="/proposals/sagicor-progress" element={<SagicorProgressDashboardPublic />} />
      <Route path="/proposals/ai-banking" element={<AIBankingPresentationPublic />} />
      <Route path="/proposals/pebbles-brand" element={<PebblesBrandPresentationPublic />} />
      <Route path="/proposals/procure-ai-ey" element={<ProcureAIEYPresentationPublic />} />
      <Route path="/proposals/procure-ai-team" element={<ProcureAIMeetTheTeamPublic />} />
      <Route path="/proposals/gdl-pebbles" element={<GDLPebblesPresentationPublic />} />
      <Route path="/proposals/ingabo" element={<IngaboPresentationPublic />} />
      <Route path="/proposals/the-forge" element={<TheForgePresentationPublic />} />
      <Route path="/proposals/the-forge-v2" element={<TheForgeV2PresentationPublic />} />
      <Route path="/proposals/tide-war" element={<TideWarPresentationPublic />} />
      <Route path="/proposals/sagicor-stec" element={<SagicorSTECPresentationPublic />} />
      <Route path="/proposals/realloc" element={<ReallocPresentationPublic />} />
      <Route path="/proposals/procureai-team" element={<ProcureAITeamPresentationPublic />} />
      <Route path="/proposals/afc-treasury" element={<AFCTreasuryPresentationPublic />} />
      <Route path="/proposals/winston-duke" element={<WinstonDukePresentation />} />
      
      {/* Internal Preview Routes (no email gate - for admins) */}
      <Route path="/proposals/preview/procure-ai" element={<ProcureAIProposalV2 />} />
      <Route path="/proposals/preview/procure-ai-executive" element={<ProcureAIExecutivePackV4 />} />
      <Route path="/proposals/preview/procure-ai-executive-v3" element={<ProcureAIExecutivePackV3 />} />
      <Route path="/proposals/preview/procure-ai-scroll" element={<ProcureAIScrollPresentation />} />
      <Route path="/proposals/preview/procure-ai-v1" element={<ProcureAIProposal />} />
      <Route path="/proposals/preview/procure-ai-twg" element={<ProcureAITWGSession />} />
      <Route path="/proposals/preview/twg-slideshow" element={<ProcureAITWGSlideshow />} />
      <Route path="/proposals/preview/town-hall-2026" element={<THCOTownHall2026V2 />} />
      <Route path="/proposals/preview/gcio-pack" element={<ProcureAIGCIOPack />} />
      <Route path="/proposals/preview/sagicor-progress" element={<SagicorProgressDashboard />} />
      <Route path="/proposals/preview/ai-banking" element={<AIBankingPresentation />} />
      <Route path="/proposals/preview/pebbles-brand" element={<PebblesBrandPresentation />} />
      <Route path="/proposals/preview/procure-ai-ey" element={<ProcureAIEYPresentation />} />
      <Route path="/proposals/preview/procure-ai-team" element={<ProcureAIMeetTheTeam />} />
      <Route path="/proposals/preview/gdl-pebbles" element={<GDLPebblesPresentation />} />
      <Route path="/proposals/preview/ingabo" element={<IngaboPresentation />} />
      <Route path="/proposals/preview/the-forge" element={<TheForgePresentation />} />
      <Route path="/proposals/preview/the-forge-v2" element={<TheForgeV2Presentation />} />
      <Route path="/proposals/preview/tide-war" element={<TideWarPresentation />} />
      <Route path="/proposals/preview/sagicor-stec" element={<SagicorSTECPresentation />} />
      <Route path="/proposals/preview/realloc" element={<ReallocPresentation />} />
      <Route path="/proposals/preview/procureai-team" element={<ProcureAITeamPresentation />} />
      <Route path="/proposals/preview/afc-treasury" element={<AFCTreasuryPresentation />} />
      
      {/* Old Executive Pack version (legacy) */}
      <Route path="/proposals/procure-ai-executive-v1" element={<ProcureAIExecutivePack />} />
      
      {/* Business Unit Routes */}
      <Route path="/sales" element={
        <ProtectedRoute unit="sales">
          <SalesAndBD />
        </ProtectedRoute>
      } />
      <Route path="/marketing" element={
        <ProtectedRoute unit="marketing">
          <MarketingAndBrand />
        </ProtectedRoute>
      } />
      <Route path="/advisory" element={
        <ProtectedRoute unit="advisory">
          <AdvisoryAndConsulting />
        </ProtectedRoute>
      } />
      <Route path="/technology" element={
        <ProtectedRoute unit="technology">
          <TechnologyAndBuild />
        </ProtectedRoute>
      } />
      <Route path="/operations" element={
        <ProtectedRoute unit="operations">
          <OperationsAndFinance />
        </ProtectedRoute>
      } />
      <Route path="/academy" element={
        <ProtectedRoute unit="academy">
          <AcademyAndLearning />
        </ProtectedRoute>
      } />
      <Route path="/client-delivery" element={
        <ProtectedRoute unit="client-delivery">
          <ClientDelivery />
        </ProtectedRoute>
      } />
      <Route path="/thco-hr" element={
        <ProtectedRoute unit="thco-hr">
          <THCOHRPage />
        </ProtectedRoute>
      } />
      <Route path="/project-management" element={
        <ProtectedRoute>
          <ProjectManagement />
        </ProtectedRoute>
      } />

      {/* THCO Flow — Project Management System (12-stage pipeline) */}
      <Route path="/flow" element={<ProtectedRoute><FlowDashboard /></ProtectedRoute>} />
      <Route path="/flow/board" element={<ProtectedRoute><FlowBoard /></ProtectedRoute>} />
      <Route path="/flow/projects" element={<ProtectedRoute><FlowProjects /></ProtectedRoute>} />
      <Route path="/flow/projects/new" element={<ProtectedRoute><FlowNewProject /></ProtectedRoute>} />
      <Route path="/flow/projects/:id" element={<ProtectedRoute><FlowProjectDetail /></ProtectedRoute>} />
      <Route path="/flow/contacts" element={<ProtectedRoute><FlowContacts /></ProtectedRoute>} />
      <Route path="/flow/calendar" element={<ProtectedRoute><FlowCalendar /></ProtectedRoute>} />
      <Route path="/flow/prospects" element={<ProtectedRoute><FlowProspects /></ProtectedRoute>} />
      <Route path="/flow/tickets" element={<ProtectedRoute><FlowTickets /></ProtectedRoute>} />
      <Route path="/flow/messages" element={<ProtectedRoute><FlowMessages /></ProtectedRoute>} />
      <Route path="/flow/admin/roles" element={<ProtectedRoute><FlowRolesAdmin /></ProtectedRoute>} />
      <Route path="/it-tools" element={
        <ProtectedRoute unit="it-tools">
          <ITAndTools />
        </ProtectedRoute>
      } />
      
      {/* FlowForge Routes */}
      <Route path="/:unit/build/new" element={
        <ProtectedRoute>
          <FlowForgeChat />
        </ProtectedRoute>
      } />
      <Route path="/:unit/build/:conversationId" element={
        <ProtectedRoute>
          <FlowForgeChat />
        </ProtectedRoute>
      } />
      
      {/* Admin Routes */}
      <Route path="/admin/approvals" element={
        <ProtectedRoute access="admin">
          <ApprovalQueue />
        </ProtectedRoute>
      } />
      <Route path="/admin/assessments" element={
        <ProtectedRoute access="hr">
          <AdminAssessments />
        </ProtectedRoute>
      } />
      
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Toaster 
          position="top-right" 
          toastOptions={{
            style: {
              background: '#151828',
              color: '#E8E6F0',
              border: '1px solid rgba(255,255,255,0.07)',
            },
          }}
        />
        <AppRouter />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
