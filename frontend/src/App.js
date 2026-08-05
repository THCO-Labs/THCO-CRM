import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";

// Pages
import Login from "./pages/Login";
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const TalentUnit = lazy(() => import("./pages/TalentUnit"));
const CandidateDatabase = lazy(() => import("./pages/CandidateDatabase"));
const CVUpload = lazy(() => import("./pages/CVUpload"));
const ExternalSourcing = lazy(() => import("./pages/ExternalSourcing"));
const FindCandidates = lazy(() => import("./pages/FindCandidates"));
const TalentNetwork = lazy(() => import("./pages/TalentNetwork"));
const MergeReviews = lazy(() => import("./pages/MergeReviews"));
const SourcingTool = lazy(() => import("./pages/SourcingTool"));
const DatabaseSearchTool = lazy(() => import("./pages/DatabaseSearchTool"));
const Settings = lazy(() => import("./pages/Settings"));
const Proposals = lazy(() => import("./pages/Proposals"));
const Tasks = lazy(() => import("./pages/Tasks"));
const ProposalView = lazy(() => import("./pages/ProposalView"));
const TaskBoardSharedView = lazy(() => import("./pages/TaskBoardSharedView"));
const ProcureAIProposal = lazy(() => import("./pages/ProcureAIProposal"));
const ProcureAIProposalV2 = lazy(() => import("./pages/ProcureAIProposalV2"));
const ProcureAIExecutivePack = lazy(() => import("./pages/ProcureAIExecutivePack"));
const ProcureAIExecutivePackV3 = lazy(() => import("./pages/ProcureAIExecutivePackV3"));
const ProcureAIExecutivePackV4 = lazy(() => import("./pages/ProcureAIExecutivePackV4"));
const ProcureAIScrollPresentation = lazy(() => import("./pages/ProcureAIScrollPresentation"));

// Business Unit Pages
const SalesAndBD = lazy(() => import("./pages/SalesAndBD"));
const MarketingAndBrand = lazy(() => import("./pages/MarketingAndBrand"));
const AdvisoryAndConsulting = lazy(() => import("./pages/AdvisoryAndConsulting"));
const TechnologyAndBuild = lazy(() => import("./pages/TechnologyAndBuild"));
const OperationsAndFinance = lazy(() => import("./pages/OperationsAndFinance"));
const AcademyAndLearning = lazy(() => import("./pages/AcademyAndLearning"));
const ClientDelivery = lazy(() => import("./pages/ClientDelivery"));
const THCOHRPage = lazy(() => import("./pages/THCOHRPage"));
const ProjectManagement = lazy(() => import("./pages/ProjectManagement"));
const ITAndTools = lazy(() => import("./pages/ITAndTools"));

// THCO Flow — Project Management System (12-stage pipeline)
const FlowDashboard = lazy(() => import("./pages/flow/FlowDashboard"));
const FlowBoard = lazy(() => import("./pages/flow/FlowBoard"));
const FlowProjects = lazy(() => import("./pages/flow/FlowProjects"));
const FlowNewProject = lazy(() => import("./pages/flow/FlowNewProject"));
const FlowProjectDetail = lazy(() => import("./pages/flow/FlowProjectDetail"));
const FlowContacts = lazy(() => import("./pages/flow/FlowContacts"));
const FlowCalendar = lazy(() => import("./pages/flow/FlowCalendar"));
const FlowProspects = lazy(() => import("./pages/flow/FlowProspects"));
const FlowTickets = lazy(() => import("./pages/flow/FlowTickets"));
const FlowMessages = lazy(() => import("./pages/flow/FlowMessages"));
const FlowRolesAdmin = lazy(() => import("./pages/flow/FlowRolesAdmin"));

// FlowForge Pages
const FlowForgeChat = lazy(() => import("./pages/FlowForgeChat"));
const ApprovalQueue = lazy(() => import("./pages/ApprovalQueue"));

// Assessment Pages
const CandidateAssessment = lazy(() => import("./pages/CandidateAssessment"));
const AdminAssessments = lazy(() => import("./pages/AdminAssessments"));

// Project Delivery Workflow Pages
const ProjectFulfillment = lazy(() => import("./pages/ProjectFulfillment"));
const NewProjectForm = lazy(() => import("./pages/NewProjectForm"));
const DelegationBoard = lazy(() => import("./pages/DelegationBoard"));
const MyProjects = lazy(() => import("./pages/MyProjects"));
const ProjectReview = lazy(() => import("./pages/ProjectReview"));
const ProjectTracker = lazy(() => import("./pages/ProjectTracker"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const Profile = lazy(() => import("./pages/Profile"));
const Feedback = lazy(() => import("./pages/Feedback"));
const ITFeedbackConsole = lazy(() => import("./pages/ITFeedbackConsole"));
const BusinessUnitsAdmin = lazy(() => import("./pages/BusinessUnitsAdmin"));
const UnitPage = lazy(() => import("./pages/UnitPage"));
import { ThemeProvider } from "./context/ThemeContext";

// Presentations
const WinstonDukePresentation = lazy(() => import("./pages/WinstonDukePresentation"));

// Public Email-Gated Presentations
const ProcureAIExecutivePackPublic = lazy(() => import("./pages/ProcureAIExecutivePackPublic"));
const ProcureAIExecutivePackV3Public = lazy(() => import("./pages/ProcureAIExecutivePackV3Public"));
const ProcureAIProposalPublic = lazy(() => import("./pages/ProcureAIProposalPublic"));
const ProcureAIScrollPublic = lazy(() => import("./pages/ProcureAIScrollPublic"));
const ProcureAIProposalV1Public = lazy(() => import("./pages/ProcureAIProposalV1Public"));
const ProcureAITWGSession = lazy(() => import("./pages/ProcureAITWGSession"));
const ProcureAITWGSessionPublic = lazy(() => import("./pages/ProcureAITWGSessionPublic"));
const ProcureAITWGSlideshow = lazy(() => import("./pages/ProcureAITWGSlideshow"));
const ProcureAITWGSlideshowPublic = lazy(() => import("./pages/ProcureAITWGSlideshowPublic"));
const THCOTownHall2026V2 = lazy(() => import("./pages/THCOTownHall2026V2"));
const THCOTownHall2026V2Public = lazy(() => import("./pages/THCOTownHall2026V2Public"));
const ProcureAIGCIOPack = lazy(() => import("./pages/ProcureAIGCIOPack"));
const ProcureAIGCIOPackPublic = lazy(() => import("./pages/ProcureAIGCIOPackPublic"));
const SagicorProgressDashboard = lazy(() => import("./pages/SagicorProgressDashboard"));
const SagicorProgressDashboardPublic = lazy(() => import("./pages/SagicorProgressDashboardPublic"));
const AIBankingPresentation = lazy(() => import("./pages/AIBankingPresentation"));
const AIBankingPresentationPublic = lazy(() => import("./pages/AIBankingPresentationPublic"));
const PebblesBrandPresentation = lazy(() => import("./pages/PebblesBrandPresentation"));
const PebblesBrandPresentationPublic = lazy(() => import("./pages/PebblesBrandPresentationPublic"));
const ProcureAIEYPresentation = lazy(() => import("./pages/ProcureAIEYPresentation"));
const ProcureAIEYPresentationPublic = lazy(() => import("./pages/ProcureAIEYPresentationPublic"));
const ProcureAIMeetTheTeam = lazy(() => import("./pages/ProcureAIMeetTheTeam"));
const ProcureAIMeetTheTeamPublic = lazy(() => import("./pages/ProcureAIMeetTheTeamPublic"));
const GDLPebblesPresentation = lazy(() => import("./pages/GDLPebblesPresentation"));
const GDLPebblesPresentationPublic = lazy(() => import("./pages/GDLPebblesPresentationPublic"));
const IngaboPresentation = lazy(() => import("./pages/IngaboPresentation"));
const IngaboPresentationPublic = lazy(() => import("./pages/IngaboPresentationPublic"));
const TheForgePresentation = lazy(() => import("./pages/TheForgePresentation"));
const TheForgePresentationPublic = lazy(() => import("./pages/TheForgePresentationPublic"));
const TheForgeV2Presentation = lazy(() => import("./pages/TheForgeV2Presentation"));
const TheForgeV2PresentationPublic = lazy(() => import("./pages/TheForgeV2PresentationPublic"));
const TideWarPresentation = lazy(() => import("./pages/TideWarPresentation"));
const TideWarPresentationPublic = lazy(() => import("./pages/TideWarPresentationPublic"));
const SagicorSTECPresentation = lazy(() => import("./pages/SagicorSTECPresentation"));
const SagicorSTECPresentationPublic = lazy(() => import("./pages/SagicorSTECPresentationPublic"));
const ReallocPresentation = lazy(() => import("./pages/ReallocPresentation"));
const ReallocPresentationPublic = lazy(() => import("./pages/ReallocPresentationPublic"));
const ProcureAITeamPresentation = lazy(() => import("./pages/ProcureAITeamPresentation"));
const ProcureAITeamPresentationPublic = lazy(() => import("./pages/ProcureAITeamPresentationPublic"));
const AFCTreasuryPresentation = lazy(() => import("./pages/AFCTreasuryPresentation"));
const AFCTreasuryPresentationPublic = lazy(() => import("./pages/AFCTreasuryPresentationPublic"));

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

// Shown while a route's chunk is fetched. Deliberately plain: it is on screen
// for a few hundred milliseconds and a heavy skeleton would itself need code.
const RouteLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0D0F1A]">
    <div className="w-8 h-8 border-2 border-[#C6A15B] border-t-transparent rounded-full animate-spin" />
  </div>
);

// App Router Component
const AppRouter = () => {
  const location = useLocation();

  // Check URL fragment for session_id (OAuth callback) - must be synchronous
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Suspense fallback={<RouteLoading />}>
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

      <Route path="/talent/duplicates" element={
        <ProtectedRoute unit="talent">
          <MergeReviews />
        </ProtectedRoute>
      } />

      <Route path="/talent/network" element={
        <ProtectedRoute unit="talent">
          <TalentNetwork />
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
      <Route path="/proposals/presentations" element={
        <ProtectedRoute>
          <Proposals />
        </ProtectedRoute>
      } />
      <Route path="/proposals/clients" element={
        <ProtectedRoute>
          <Proposals />
        </ProtectedRoute>
      } />

      <Route path="/tasks" element={
        <ProtectedRoute>
          <Tasks />
        </ProtectedRoute>
      } />
      
      {/* Public Proposal View - No Auth Required */}
      <Route path="/proposals/view/:shareToken" element={<ProposalView />} />

      {/* Public Task Board Share View - No Auth Required */}
      <Route path="/tasks/shared/:shareToken" element={<TaskBoardSharedView />} />
      
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
    </Suspense>
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
