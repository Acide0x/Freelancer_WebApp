// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./Home";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import JobsPage from "./pages/JobListing";
import WorkersPage from "./pages/WorkerListing";
import WorkerProfile from "./pages/WorkerProfile";
import ProfilePage from "./pages/ProfilePage";
import Navbar from './components/Navbar';
import Footer from './components/footer'; 
import { AppProvider } from './context/AppContext';

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
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/workers" element={<WorkersPage />} />
          <Route path="/worker/:id" element={<WorkerProfile />} />
          <Route path="/profile" element={<ProfilePage />} />
          {/* Add more routes as needed */}
        </Routes>
        <Footer />
      </BrowserRouter>
    </AppProvider>
  );
}