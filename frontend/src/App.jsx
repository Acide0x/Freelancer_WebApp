// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import HomePage from "./Home";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import JobsPage from "./pages/JobListing";
import WorkersPage from "./pages/WorkerListing";
import WorkerProfilePage from "./pages/WorkerDetailPage";
import JobOffersPage from "./pages/JobOffersPage";
import ProfilePage from "./pages/ProfilePage";
import WorkersDashboardPage from "./pages/WorkersDashboardPage"; 
import AdminDashboardClient from "./pages/AdminDashboardPage";

import Navbar from './components/Navbar';
import Footer from './components/footer'; 
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
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/workers" element={<WorkersPage />} />
            <Route path="/provider/:id" element={<WorkerProfilePage />} />
            <Route path="/job-offers/:id" element={<JobOffersPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            {/* Single route for full worker dashboard */}
            <Route path="/workersdashboard" element={<WorkersDashboardPage />} />
            <Route path="/admindashboard" element={<AdminDashboardClient />} /> 
            {/* Optional: catch-all fallback */}
            <Route path="*" element={<HomePage />} />
          </Routes>
        </main>
        <Footer />
        {/* Renders Sonner Toaster once in the app */}
        <Toaster position="bottom-center" richColors />
      </BrowserRouter>
    </AppProvider>
  );
}