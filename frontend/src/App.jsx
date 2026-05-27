// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "leaflet/dist/leaflet.css";

// Pages
import HomePage from "./Home";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import JobsPage from "./pages/JobListing";
import JobDetailPage from "./pages/JobDetailPage";
import WorkersPage from "./pages/WorkerListing";
import WorkerProfilePage from "./pages/WorkerDetailPage";
import JobOffersPage from "./pages/JobOfferPage";
import MyApplicationsPage from "./pages/MyJobApplicationPage";
import ProfilePage from "./pages/ProfilePage";
import WorkersDashboardPage from "./pages/WorkersDashboardPage";
import AdminDashboardClient from "./pages/AdminDashboardPage";
import DiscussionForum from "./pages/DiscussionPostListing";
import DiscussionPage from "./pages/DiscussionPostDetailsPage";
import ActiveJobsPage from "./pages/ActiveJobsPage"; 
import AdminLayout from "./pages/AdminLayoutPage";
import KYCVerification from "./pages/KYCVerificationPage";
import NotificationsPage from "./pages/NotificationsPage";
// import JobChatPage from "./pages/JobChatPage";

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Context & Utils
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext'; // 🔐 Import AuthProvider

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      {/* 🔐 Wrap entire app with AuthProvider */}
      <AuthProvider>
        <Navbar />
        <main className="min-h-screen">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Job Routes */}
            <Route path="/jobs" element={<JobsPage />} />
            {/* Static segments MUST come before /:id — React Router matches top-down */}
            <Route path="/jobs/active" element={<ActiveJobsPage />} />
            <Route path="/jobs/:id" element={<JobDetailPage />} />
            {/* <Route path="/jobs/:id/chat" element={<JobChatPage />} /> */}

            {/* Worker Routes */}
            <Route path="/workers" element={<WorkersPage />} />
            <Route path="/provider/:id" element={<WorkerProfilePage />} />

            {/* Other Routes */}
            <Route path="/job-offers/:id" element={<JobOffersPage />} />
            <Route path="/my-applications/:id" element={<MyApplicationsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/workersdashboard" element={<WorkersDashboardPage />} />
            <Route path="/admindashboard" element={<AdminDashboardClient />} />

            {/* Discussion Forum Route */}
            <Route path="/discussions" element={<DiscussionForum />} />
            <Route path="/discussions/:id" element={<DiscussionPage />} />

            {/* Admin Routes */}
            <Route path="/admin/*" element={<AdminLayout />} />
            <Route path="/kyc-verification" element={<KYCVerification />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            
            {/* Catch-all fallback */}
            <Route path="*" element={<HomePage />} />
          </Routes>
        </main>
        <Footer />
        <Toaster position="bottom-center" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}