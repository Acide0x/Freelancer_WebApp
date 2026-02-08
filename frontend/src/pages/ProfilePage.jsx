// src/pages/ProfilePage.jsx
import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileTab from "@/components/MyProfile/ProfileTab";
import OnboardingTab from "@/components/MyProfile/OnboardingTab";
import SecurityTab from "@/components/MyProfile/SecurityTab";
import api from "@/api/api";

// Helper to safely get user from localStorage
const getUserFromStorage = () => {
  try {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    console.warn("Failed to parse user from localStorage", e);
    return null;
  }
};

// Normalize profile data for UI
const normalizeProfile = (user) => ({
  _id: user._id || user.id,
  fullName: user.fullName || "",
  email: user.email || "",
  phone: user.phone || "",
  avatar: user.avatar || "/placeholder.svg",
  role: user.role || "customer",
  kycVerified: user.kycVerified || false,
  location: user.location || { address: "Not specified" },
  bio: user.bio || "",
  joinDate: user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    })
    : "Unknown",
});

// Extract provider onboarding data
const getOnboardingDataFromUser = (user) => {
  const defaultData = {
    headline: "",
    workDescription: "",
    skills: [],
    rate: 50,
    minCallOutFee: 30,
    travelFeePerKm: 2,
    travelThresholdKm: 15,
    fixedRateProjects: [],
    availabilityStatus: "available",
    portfolios: [],
    serviceAreas: [],
    experienceYears: 0,
    verificationStatus: "incomplete",
  };

  // If not provider, return default
  if (!user || user.role !== "provider") {
    return defaultData;
  }

  const pd = user.providerDetails || {};

  return {
    headline: pd.headline || "",
    workDescription: pd.workDescription || "",
    skills: Array.isArray(pd.skills) ? [...pd.skills] : [],
    rate: typeof pd.rate === 'number' ? pd.rate : 50,
    minCallOutFee: typeof pd.minCallOutFee === 'number' ? pd.minCallOutFee : 30,
    travelFeePerKm: typeof pd.travelFeePerKm === 'number' ? pd.travelFeePerKm : 2,
    travelThresholdKm: typeof pd.travelThresholdKm === 'number' ? pd.travelThresholdKm : 15,
    fixedRateProjects: Array.isArray(pd.fixedRateProjects) ? [...pd.fixedRateProjects] : [],
    availabilityStatus: ["available", "busy", "offline"].includes(pd.availabilityStatus)
      ? pd.availabilityStatus
      : "available",
    portfolios: Array.isArray(pd.portfolios) ? [...pd.portfolios] : [],
    serviceAreas: Array.isArray(pd.serviceAreas) ? [...pd.serviceAreas] : [],
    experienceYears: typeof pd.experienceYears === 'number' ? pd.experienceYears : 0,
    // 🔑 Preserve real status from backend
    verificationStatus: pd.verificationStatus || "incomplete",
  };
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [onboardingData, setOnboardingData] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
    toast.success("Logged out successfully");
  }, [navigate]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Try to fetch fresh data from backend
        const response = await api.get("/users/profile");
        const user = response.data.user;

        // Save to localStorage for offline/fallback use
        localStorage.setItem("user", JSON.stringify(user));

        setProfile(normalizeProfile(user));
        setOnboardingData(getOnboardingDataFromUser(user));
      } catch (error) {
        console.error("API fetch failed:", error);

        // Fallback: try cached user data
        const cachedUser = getUserFromStorage();
        if (cachedUser) {
          setProfile(normalizeProfile(cachedUser));
          setOnboardingData(getOnboardingDataFromUser(cachedUser));
          toast.warning("Using cached profile. Some data may be outdated.");
        } else {
          // No session at all → redirect to login
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login", { replace: true });
          toast.error("Please log in to access your profile.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  if (loading || !profile || !onboardingData) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Loading your profile...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-gray-900 font-sans selection:bg-gray-200 pb-20">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <Tabs defaultValue="personal" className="space-y-12">
          <div className="flex flex-col md:flex-row justify-between gap-8 border-b border-gray-200 pb-6">
            <div className="space-y-2">
              <h1 className="text-5xl font-black tracking-tighter italic uppercase">
                Your Account
              </h1>
              <p className="text-gray-500 font-medium">
                Manage your personal information, provider details, and security.
              </p>
            </div>
            <TabsList className="bg-transparent border-none p-0 h-auto gap-8 justify-start">
              <TabsTrigger
                value="personal"
                className="data-[state=active]:text-black text-gray-500 p-0 bg-transparent font-black uppercase tracking-widest text-xs h-auto data-[state=active]:shadow-none relative after:absolute after:bottom-[-25px] after:left-0 after:w-full after:h-[2px] after:bg-black after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
              >
                Profile
              </TabsTrigger>
              {profile.role === "provider" && (
                <TabsTrigger
                  value="provider"
                  className="data-[state=active]:text-black text-gray-500 p-0 bg-transparent font-black uppercase tracking-widest text-xs h-auto data-[state=active]:shadow-none relative after:absolute after:bottom-[-25px] after:left-0 after:w-full after:h-[2px] after:bg-black after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
                >
                  Onboarding
                </TabsTrigger>
              )}
              <TabsTrigger
                value="security"
                className="data-[state=active]:text-black text-gray-500 p-0 bg-transparent font-black uppercase tracking-widest text-xs h-auto data-[state=active]:shadow-none relative after:absolute after:bottom-[-25px] after:left-0 after:w-full after:h-[2px] after:bg-black after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform"
              >
                Security
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="personal" className="m-0 focus-visible:ring-0">
            <ProfileTab
              profile={profile}
              onUpdateProfile={setProfile}
              onLogout={handleLogout}
            />
          </TabsContent>

          {profile.role === "provider" && (
            <TabsContent value="provider" className="m-0 focus-visible:ring-0">
              <OnboardingTab
                providerStatus={onboardingData.verificationStatus}
                onboardingData={onboardingData}
              />
            </TabsContent>
          )}

          <TabsContent value="security" className="m-0 focus-visible:ring-0">
            <SecurityTab profile={profile} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}