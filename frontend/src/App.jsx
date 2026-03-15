// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "leaflet/dist/leaflet.css";

// Pages
import HomePage from "./Home";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import JobsPage from "./pages/JobListing";
import JobDetailPage from "./pages/JobDetailPage"; // ✅ NEW IMPORT
import WorkersPage from "./pages/WorkerListing";
import WorkerProfilePage from "./pages/WorkerDetailPage";
import JobOffersPage from "./pages/JobOfferPage";
import MyApplicationsPage from "./pages/MyJobApplicationPage";
import ProfilePage from "./pages/ProfilePage";
import WorkersDashboardPage from "./pages/WorkersDashboardPage"; 
import AdminDashboardClient from "./pages/AdminDashboardPage";

// Components
import Navbar from './components/Navbar';
import Footer from './components/footer'; 

// Context & Utils
import { AppProvider } from './context/AppContext';
import { Toaster } from 'sonner'; 

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Navbar />
        <main className="min-h-screen">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            
            {/* ✅ Job Routes */}
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/jobs/:id" element={<JobDetailPage />} /> {/* ✅ NEW ROUTE */}
            
            {/* ✅ Worker Routes */}
            <Route path="/workers" element={<WorkersPage />} />
            <Route path="/provider/:id" element={<WorkerProfilePage />} />
            
            {/* ✅ Other Routes */}
            <Route path="/job-offers/:id" element={<JobOffersPage />} />
            <Route path="/my-applications/:id" element={<MyApplicationsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/workersdashboard" element={<WorkersDashboardPage />} />
            <Route path="/admindashboard" element={<AdminDashboardClient />} />
            
            {/* ✅ Catch-all fallback */}
            <Route path="*" element={<HomePage />} />
          </Routes>
        </main>
        <Footer />
        <Toaster position="bottom-center" richColors />
      </BrowserRouter>
    </AppProvider>
  );
}