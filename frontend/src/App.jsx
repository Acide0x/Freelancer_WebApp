// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import HomePage from "./Home";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import JobsPage from "./pages/JobListing";
import WorkersPage from "./pages/WorkerListing";
import WorkerProfile from "./pages/WorkerProfile";
import ProfilePage from "./pages/ProfilePage";
import WorkersDashboardPage from "./pages/WorkersDashboardPage"; // ✅ Only dashboard route needed
import AdminDashboardClient from "./pages/AdminDashboardPage";

import Navbar from './components/Navbar';
import Footer from './components/footer'; 
import { AppProvider } from './context/AppContext';
import { Toaster } from 'sonner'; // ✅ Add Sonner Toaster (recommended)

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
            <Route path="/worker/:id" element={<WorkerProfile />} />
            <Route path="/profile" element={<ProfilePage />} />
            {/* ✅ Single route for full worker dashboard */}
            <Route path="/workersdashboard" element={<WorkersDashboardPage />} />
            <Route path="/admindashboard" element={<AdminDashboardClient />} /> 
            {/* Optional: catch-all fallback */}
            <Route path="*" element={<HomePage />} />
          </Routes>
        </main>
        <Footer />
        {/* ✅ Render Sonner Toaster once in the app */}
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AppProvider>
  );
}