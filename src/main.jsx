import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";

// Real pages you already have
import LeadTracker from "./Pages/LeadTracker.jsx";
import Potentials from "./Pages/Potential.jsx";
import Login from "./Pages/Login.jsx";
import KPIGoals from "./KPI/KPIGoal.jsx";
import Disqualified from "./Pages/Disqualified.jsx";
import SpamData from "./Pages/SpamData.jsx";
import InfoEmail from "./Pages/InfoEmail.jsx"
import LLMData from "./Pages/LLMData.jsx"
import Booking from "./Pages/Booking.jsx"
import Captcha from "./Pages/Captcha.jsx"
import ContentWebPages from "./Content/ContentWebPages.jsx";
import ContentDashBoard from "./Content/ContentDashBoard.jsx"
import DashBoard from "./Pages/DashBoard.jsx"
import LeadDashBoard from "./Pages/LeadsDashBoard.jsx"
import SeoPageInsight from "./SEO/SeoPageInsight.jsx"
import SeoPersonas from "./SEO/Personas.jsx"
import FWSContact from "./Resources/FWSContact.jsx"
import CallRailTracket from "./CallRailTracker/CallRailTracket.jsx"
import ChatTracker from "./ChatTracker/ChatTracker.jsx"
import UTMBuilder from "./UTMBuilder/UTMBuilder.jsx"
import ChatConversation from "./ChatConversation/ChatConversation.jsx";
import UTMEnrih from "./UTMEnrich/UTMEnrich.jsx"
import PotentialsForm from "./PotentialForm/PotentailForm.jsx";
import PotentialLookup from "./Resources/PotentialLookup.jsx";
import UniversalTollForm from "./Resources/UniversalTollForm.jsx";
import KeywordSearch from "./Resources/KeywordSearch.jsx";
import CampaignSetting from "./Setting/CampaignSetting.jsx"
import Department from "./Setting/Department.jsx"
import Cronjob from "./Setting/Cronjob.jsx";
import SeoDashBoard from "./SEO/SeoDashBoard.jsx";
import User from "./Setting/User.jsx"
import Teams from "./Setting/Teams.jsx"
import SpamFilter from "./Setting/SpamFilter.jsx";
import Services from "./Setting/Services.jsx";
import SubServices from "./Pages/Resources/Services.jsx";
import ServiceHub from "./Pages/Resources/ServiceHub.jsx";
import Jobs from "./Setting/Jobs.jsx";
import LogViewer from "./Setting/LogViewer.jsx";
import Credentials from "./Setting/Credentials.jsx";
import NavigationMapping from "./Setting/NavigationMapping.jsx";
import StageManager from "./Resources/Stage.jsx";
import StatusManager from "./Resources/Status.jsx";
import RivalFlow from "./Content/RivalFlow.jsx";
import ContentPipeline from "./Pipeline/ContentPipeline.jsx";
import Profile from "./Pages/Profile.jsx";
import AdhocTasks from "./Adhoc/AdhocTasks.jsx";
import TodoTasks from "./Todo/TodoTasks.jsx";
import DownloadFiles from "./Resources/DownloadFiles.jsx";
import FAQs from "./Resources/FAQs.jsx";
import MicrosoftCallback from "./Pages/MicrosoftCallback.jsx";
import TelemarketingBooking from "./Pages/TelemarketingBooking.jsx";
import LiveChatComparison from "./Pages/Resources/LiveChatComparison.jsx";


// Simple placeholder component for all other routes
const Stub = ({ title }) => (
  <div className="card p-6">
    <h1 className="text-xl font-semibold text-slate-900 mb-2">{title}</h1>
    <p className="text-sm text-slate-600">This is a placeholder page. Replace with real content.</p>
  </div>
);

const routes = [
  // User Profile
  { path: "profile", element: <Profile /> },
  // Leads
  { path: "dashboard", element: <DashBoard /> },
  { path: "leads", element: <LeadTracker /> },
  { path: "leads/dashboard", element: <LeadDashBoard /> },
  { path: "potentials", element: <Potentials /> },
  { path: "disqualified", element: <Disqualified /> },
  { path: "spam", element: <SpamData /> },
  { path: "captcha", element: <Captcha /> },
  { path: "info-email", element: <InfoEmail /> },
  { path: "llm", element: <LLMData /> },
  { path: "bookings", element: <Booking /> },

  // Content Tracker
  { path: "content/dashboard", element: <ContentDashBoard /> },
  { path: "content/web-pages", element: <ContentWebPages /> },
  { path: "content/rivalflow", element: <RivalFlow /> },
  { path: "content/pipeline", element: <ContentPipeline /> },

  // SEO
  { path: "seo/dashboard", element: <SeoDashBoard /> },
  { path: "seo/page-insights", element: <SeoPageInsight /> },
  { path: "seo/personas", element: <SeoPersonas /> },


  { path: "kpi/goals", element: <KPIGoals /> },

  // AD-HOC
  { path: "adhoc/tasks", element: <AdhocTasks /> },

  // Todo Tasks
  { path: "todo/tasks", element: <TodoTasks /> },

  // FWS Resources
  { path: "resources/fws-contacts", element: <FWSContact /> },
  { path: "tollfree-form", element: <UniversalTollForm /> },
  { path: "resources/chat-tracker", element: <ChatTracker /> },
  { path: "resources/chat-conversation", element: <ChatConversation /> },
  { path: "resources/potential-form", element: <PotentialsForm /> },
  { path: "resources/potential-lookup", element: <PotentialLookup /> },
  { path: "resources/callrail-tracker", element: <CallRailTracket /> },
  { path: "resources/utm-builder", element: <UTMBuilder /> },
  { path: "resources/utm-enrich", element: <UTMEnrih /> },
  { path: "resources/keyword-search", element: <KeywordSearch /> },
  { path: "resources/download-files", element: <DownloadFiles /> },
  { path: "resources/faqs", element: <FAQs /> },
  { path: "resources/telemarketing-booking", element: <TelemarketingBooking /> },
  { path: "livechat-comparison", element: <LiveChatComparison /> },

  // Settings
  { path: "settings/nav-mapping", element: <NavigationMapping /> },
  { path: "settings/campaings", element: <CampaignSetting /> },
  { path: "settings/departments", element: <Department /> },
  { path: "settings/users", element: <User /> },
  { path: "settings/teams", element: <Teams /> },
  { path: "settings/cronjobs", element: <Cronjob /> },
  { path: "settings/spam-filter", element: <SpamFilter /> },
  // { path: "settings/navigation", element: <NavigationMapping /> },
  { path: "settings/services", element: <Services /> },
  { path: "settings/logs", element: <LogViewer /> },
  { path: "settings/jobs", element: <Jobs /> },
  { path: "settings/credentials", element: <Credentials /> },
  { path: "settings/stages", element: <StageManager /> },
  { path: "settings/statuses", element: <StatusManager /> },
];

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  
  // Microsoft OAuth callback route - handles authentication response from backend
  { 
    path: "/auth/callback", 
    element: <MicrosoftCallback /> 
  },

  // Resources service page without sidebar (for users with role_id = null)
  { 
    path: "/resources/service", 
    element: <SubServices /> 
  },

  // Service Hub page without sidebar (for users with role_id = null)
  { 
    path: "/servicehub/:service_name?", 
    element: <ServiceHub /> 
  },

  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },

      ...routes,
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
