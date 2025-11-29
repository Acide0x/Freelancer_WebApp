// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./Home";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import JobsPage from "./pages/JobListing";       // ✅ Added
import WorkersPage from "./pages/WorkerListing"; // ✅ Added
import WorkerProfile from "./pages/WorkerProfile";
import Navbar from './components/Navbar';
import Footer from './components/footer'; 
import { AppProvider } from './context/AppContext';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/jobs" element={<JobsPage />} />       {/* ✅ */}
          <Route path="/workers" element={<WorkersPage />} /> {/* ✅ */}
          <Route path="/worker/:id" element={<WorkerProfile />} />
          {/* Add more routes as needed */}
        </Routes>
        <Footer />
      </BrowserRouter>
    </AppProvider>
  );
}