// src/pages/ProfilePage.jsx
import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, ShieldCheck } from "lucide-react";

// ✅ IMPORT SPLIT TABS
import ProfileTab from "@/components/MyProfile/ProfileTab";
import OnboardingTab from "@/components/MyProfile/OnboardingTab";
import SecurityTab from "@/components/MyProfile/SecurityTab";

const defaultProfile = {
  fullName: "Alex Johnson",
  email: "alex@example.com",
  phone: "+1 (555) 123-4567",
  avatar: "/diverse-user-avatars.png",
  role: "provider",
  kycVerified: true,
  location: {
    address: "San Francisco, CA",
    coordinates: [-122.4194, 37.7749],
  },
};

// Default onboarding structure — adjust based on your actual fields
const defaultOnboardingData = {
  businessName: "",
  licenseNumber: "",
  serviceAreas: [],
  taxId: "",
  bankAccount: "",
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(defaultProfile);
  const [onboardingData, setOnboardingData] = useState(defaultOnboardingData);

  // ✅ Derive provider status from onboarding data completeness
  const providerStatus = React.useMemo(() => {
    const requiredFields = ["businessName", "licenseNumber", "taxId"];
    const isComplete = requiredFields.every(
      (field) => onboardingData[field]?.trim() !== ""
    );
    return isComplete ? "complete" : "incomplete";
  }, [onboardingData]);

  // ✅ Secure logout: clear auth state + navigate
  const handleLogout = useCallback(() => {
    // Clear authentication state (adjust based on your setup)
    localStorage.removeItem("token"); // or sessionStorage, cookies, etc.
    // If using auth context: authContext.logout()

    navigate("/login", { replace: true });
    toast.success("Logged out successfully");
  }, [navigate]);

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
                providerStatus={providerStatus}
                onboardingData={onboardingData}
                onUpdateOnboardingData={setOnboardingData}
                // Note: onStatusChange removed since status is now derived
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