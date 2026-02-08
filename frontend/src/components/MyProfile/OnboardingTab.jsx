// src/components/MyProfile/OnboardingTab.jsx
import React, { useState, useEffect } from "react";
import {
  Briefcase,
  Award,
  DollarSign,
  FolderKanban,
  Navigation,
  ShieldCheck,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/api/api";

// -----------------------------
// 🗺️ MAP COMPONENT (Embedded)
// -----------------------------
import { MapContainer, TileLayer, Circle, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function LocationSetter({ onLocationSelect, isReadOnly }) {
  useMapEvents({
    click(e) {
      if (isReadOnly) return;
      const { lat, lng } = e.latlng;
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then((res) => res.json())
        .then((data) => {
          const address = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          onLocationSelect({ lat, lng, address });
        })
        .catch(() => {
          onLocationSelect({ lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
        });
    },
  });
  return null;
}

function MapWithCoverage({ coordinates, radiusKm, address, onLocationSelect, isReadOnly }) {
  const defaultCenter = [27.7172, 85.3240]; // Kathmandu fallback
  const center = coordinates && coordinates.length === 2 ? [coordinates[0], coordinates[1]] : defaultCenter;
  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={false}
      dragging={!isReadOnly}
      zoomControl={!isReadOnly}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {!isReadOnly && <LocationSetter onLocationSelect={onLocationSelect} isReadOnly={isReadOnly} />}
      {coordinates && coordinates.length === 2 && (
        <>
          <Circle
            center={[coordinates[0], coordinates[1]]}
            radius={radiusKm * 1000}
            color="#3b82f6"
            fillColor="#3b82f6"
            fillOpacity={0.2}
            weight={2}
          />
          <div
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              zIndex: 1000,
              background: "white",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }}
          >
            {address}
          </div>
        </>
      )}
    </MapContainer>
  );
}

// -----------------------------
// ONBOARDING CONFIG
// -----------------------------
const ONBOARDING_STEPS = [
  { id: "bio", title: "Bio", icon: <Briefcase className="w-4 h-4" /> },
  { id: "skills", title: "Skills", icon: <Award className="w-4 h-4" /> },
  { id: "rates", title: "Rates & Status", icon: <DollarSign className="w-4 h-4" /> },
  { id: "portfolio", title: "Portfolio", icon: <FolderKanban className="w-4 h-4" /> },
  { id: "service", title: "Service Area", icon: <Navigation className="w-4 h-4" /> },
  { id: "review", title: "Final Review", icon: <ShieldCheck className="w-4 h-4" /> },
];

const defaultOnboardingData = {
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

const mergeWithDefaults = (incomingData) => {
  // Preserve actual verificationStatus if it exists in incoming data
  const actualStatus = incomingData?.verificationStatus || "incomplete";

  return {
    ...defaultOnboardingData,
    ...(incomingData || {}),
    // 👇 CRITICAL: enforce real status
    verificationStatus: actualStatus,

    // Safely handle arrays
    skills: Array.isArray(incomingData?.skills) ? [...incomingData.skills] : [],
    fixedRateProjects: Array.isArray(incomingData?.fixedRateProjects)
      ? [...incomingData.fixedRateProjects]
      : [],
    portfolios: Array.isArray(incomingData?.portfolios)
      ? [...incomingData.portfolios]
      : [],
    serviceAreas: Array.isArray(incomingData?.serviceAreas)
      ? [...incomingData.serviceAreas]
      : [],
  };
};

const saveOnboardingToBackend = async (onboardingData) => {
  try {
    const response = await api.patch("/users/onboarding", onboardingData);
    return response.data.providerDetails;
  } catch (error) {
    console.error("Onboarding save error:", error);
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to save onboarding data";
    toast.error(message);
    throw error;
  }
};

// -----------------------------
// MAIN COMPONENT
// -----------------------------
export default function OnboardingTab({

  providerStatus: initialStatus,
  onboardingData: initialData,
}) {
  console.log("Initial data received:", initialData);

  const [currentStep, setCurrentStep] = useState(0);
  const [localOnboardingData, setLocalOnboardingData] = useState(
    mergeWithDefaults(initialData)
  );
  const [isSaving, setIsSaving] = useState(false);

  const nextStep = () => {
    setCurrentStep((s) => Math.min(s + 1, ONBOARDING_STEPS.length - 1));
  };

  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handleSubmitVerification = async () => {
    setIsSaving(true);
    try {
      const updatedData = await saveOnboardingToBackend({
        ...localOnboardingData,
        verificationStatus: "pending",
      });
      setLocalOnboardingData(updatedData);
      toast.success("Application submitted for review!");
    } catch (err) {
      // Error shown in helper
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const updatedData = await saveOnboardingToBackend({
        ...localOnboardingData,
        verificationStatus: "incomplete",
      });
      setLocalOnboardingData(updatedData);
      toast.success("Draft saved");
    } catch (err) {
      // Error shown in helper
    } finally {
      setIsSaving(false);
    }
  };

  const updateLocalData = (updates) => {
    setLocalOnboardingData((prev) => ({ ...prev, ...updates }));
  };

  // 🔒 Enforce read-only for both 'pending' AND 'approved'
  const isReadOnly =
    localOnboardingData.verificationStatus === "pending" ||
    localOnboardingData.verificationStatus === "approved";

  useEffect(() => {
    setLocalOnboardingData(mergeWithDefaults(initialData));
  }, [initialData]);

  const providerStatus = localOnboardingData.verificationStatus;

  // Show special screen only for 'pending'
  if (providerStatus === "pending") {
    return (
      <Card className="max-w-2xl mx-auto p-12 bg-white border-gray-200 text-center rounded-3xl shadow">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-8 border border-yellow-200">
          <Clock className="w-10 h-10 text-yellow-600" />
        </div>
        <h2 className="text-3xl font-black mb-4 italic tracking-tighter uppercase">
          Application Sent
        </h2>
        <p className="text-gray-500 mb-8 leading-relaxed max-w-sm mx-auto font-medium">
          Your provider details have been submitted. Our verification team is
          currently reviewing your expertise. This is now{" "}
          <span className="text-gray-900 font-black">Read-Only</span> until
          approved.
        </p>
        <div className="p-5 bg-gray-50 border border-gray-200 rounded-2xl text-left mb-8 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">
              Status
            </p>
            <p className="text-sm font-black uppercase tracking-widest">
              In Review
            </p>
          </div>
          <Button
            onClick={async () => {
              try {
                const updated = await saveOnboardingToBackend({
                  verificationStatus: "incomplete",
                });
                setLocalOnboardingData(updated);
              } catch (err) {
                /* error handled */
              }
            }}
            variant="ghost"
            className="text-gray-400 hover:text-gray-900 text-[10px] uppercase font-black"
          >
            Cancel & Edit
          </Button>
        </div>
      </Card>
    );
  }

  // Show read-only summary for 'approved' users
  if (providerStatus === "approved") {
    const data = localOnboardingData;
    return (
      <Card className="max-w-4xl mx-auto p-10 bg-white border-gray-200 rounded-3xl shadow">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-200">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-black mb-4 italic tracking-tighter uppercase">
            Profile Approved ✅
          </h2>
          <p className="text-gray-500 max-w-md mx-auto font-medium">
            Your provider profile is live! Below is your current public profile.
          </p>
        </div>

        {/* Summary Content */}
        <div className="space-y-10 mb-10">
          {/* 1. Identity & Bio */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-2">
              1. Identity & Bio
            </h3>
            <div className="p-6 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
              <p className="text-2xl font-black italic tracking-tighter">
                {data.headline || "Unspecified Headline"}
              </p>
              <p className="text-sm text-gray-600 leading-relaxed font-medium">
                {data.workDescription || "No professional bio provided."}
              </p>
            </div>
          </section>

          {/* 2. Technical Skills */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-2">
              2. Technical Skills
            </h3>
            <div className="grid gap-3">
              {(data.skills || []).map((skill, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl"
                >
                  <span className="font-black text-gray-800">{skill.name}</span>
                  <div className="flex gap-4 items-center">
                    <Badge className="bg-gray-100 text-gray-800 italic font-black">
                      Lvl {skill.proficiency}/10
                    </Badge>
                    <Badge variant="outline" className="border-gray-200 text-gray-500">
                      {skill.years} Yrs
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Financial Framework */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-2">
              3. Financial Framework
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="text-[8px] font-black text-gray-400 uppercase">Hourly Rate</p>
                <p className="text-lg font-black">${data.rate}/hr</p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="text-[8px] font-black text-gray-400 uppercase">Call-out</p>
                <p className="text-lg font-black">${data.minCallOutFee}</p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="text-[8px] font-black text-gray-400 uppercase">Travel Fee</p>
                <p className="text-lg font-black">${data.travelFeePerKm}/km</p>
              </div>
            </div>
            {(data.fixedRateProjects || []).length > 0 && (
              <div className="space-y-3 mt-4">
                <p className="text-[8px] font-black text-gray-400 uppercase">Fixed Projects</p>
                {(data.fixedRateProjects || []).map((p, i) => (
                  <div
                    key={i}
                    className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex justify-between items-center"
                  >
                    <div className="space-y-1">
                      <p className="font-bold text-sm">{p.name}</p>
                      <p className="text-[10px] text-gray-500 line-clamp-1">{p.details}</p>
                    </div>
                    <p className="font-black text-lg">${p.rate}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 4. Portfolio Showcase */}
          {(data.portfolios || []).length > 0 && (
            <section className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-2">
                4. Portfolio Showcase
              </h3>
              <div className="space-y-4">
                {(data.portfolios || []).map((p, i) => (
                  <div
                    key={i}
                    className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <p className="font-black italic uppercase tracking-tighter text-sm">
                        {p.title}
                      </p>
                      <Badge className="bg-gray-100 text-gray-500 text-[8px]">
                        {p.images?.length || 0} Images
                      </Badge>
                    </div>
                    {p.description && (
                      <p className="text-sm text-gray-600">{p.description}</p>
                    )}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {p.images?.map((img, ii) => (
                        <img
                          key={ii}
                          src={img}
                          className="w-12 h-12 object-cover rounded-lg border border-gray-200 shrink-0"
                          onError={(e) => (e.target.src = "/placeholder.svg")}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 5. Service Areas */}
          {(data.serviceAreas || []).length > 0 && (
            <section className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-2">
                5. Service Areas
              </h3>
              <div className="space-y-4">
                {(data.serviceAreas || []).map((area, i) => (
                  <div
                    key={i}
                    className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-black italic tracking-tighter text-sm">
                          {area.address || "Unnamed Location"}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1">
                          Serves up to <span className="font-bold">{area.radiusKm} km</span> radius
                        </p>
                      </div>
                      {area.coordinates && (
                        <Badge className="bg-blue-100 text-blue-800 text-[8px] font-black">
                          Lat: {area.coordinates[1]?.toFixed(4)}, Lng: {area.coordinates[0]?.toFixed(4)}
                        </Badge>
                      )}
                    </div>

                    {/* Static Map Preview - OpenStreetMap (no API key) */}
                    {area.coordinates && (
                      <div className="mt-3 overflow-hidden rounded-lg border border-gray-200">
                        <img
                          src={`https://www.openstreetmap.org/staticmap?center=${area.coordinates[1]},${area.coordinates[0]}&zoom=12&size=600x200&markers=${area.coordinates[1]},${area.coordinates[0]}&format=png`}
                          alt={`Service area ${i + 1}`}
                          className="w-full h-auto object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Edit Button */}
        <div className="flex justify-center pt-6 border-t border-gray-200">
          <Button
            onClick={async () => {
              try {
                const updated = await saveOnboardingToBackend({
                  verificationStatus: "incomplete",
                });
                setLocalOnboardingData(updated);
              } catch (err) {
                /* error already handled in saveOnboardingToBackend */
              }
            }}
            variant="outline"
            className="text-green-700 border-green-300 hover:bg-green-50 font-black text-[10px] uppercase px-6 py-3"
          >
            Edit Profile
          </Button>
        </div>
      </Card>
    );
  }

  const data = localOnboardingData;

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Step Indicator */}
      <div className="flex items-center justify-between relative px-4">
        <div className="absolute top-5 left-0 w-full h-[1px] bg-gray-200 -z-10" />
        {ONBOARDING_STEPS.map((step, idx) => (
          <div key={step.id} className="flex flex-col items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${idx <= currentStep
                ? "bg-black border-black text-white shadow-[0_0_20px_rgba(0,0,0,0.1)]"
                : "bg-white border-gray-200 text-gray-400"
                }`}
            >
              {idx < currentStep ? (
                <CheckCircle2 className="w-5 h-5 text-white" />
              ) : (
                step.icon
              )}
            </div>
            <span
              className={`text-[10px] font-black uppercase tracking-widest ${idx === currentStep ? "text-black" : "text-gray-400"
                }`}
            >
              {step.title}
            </span>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="bg-white border-gray-200 p-10 min-h-[550px] flex flex-col rounded-3xl shadow border-t-gray-300">
        <div className="flex-1 space-y-8">
          {currentStep === 0 && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-3xl font-black tracking-tighter uppercase italic">
                Professional Bio
              </h2>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Professional Headline
                  </label>
                  <Input
                    value={data.headline}
                    onChange={(e) => !isReadOnly && updateLocalData({ headline: e.target.value })}
                    placeholder="e.g. Master Plumber with 15 years experience"
                    className="bg-gray-100 border-gray-200 h-14 rounded-xl"
                    disabled={isReadOnly}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Experience Bio
                  </label>
                  <Textarea
                    value={data.workDescription}
                    onChange={(e) =>
                      !isReadOnly && updateLocalData({ workDescription: e.target.value })
                    }
                    placeholder="Describe your background and expertise..."
                    className="bg-gray-100 border-gray-200 min-h-[180px] rounded-xl"
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tighter uppercase italic">
                  Expertise & Proficiency
                </h2>
                <p className="text-gray-500 font-medium">
                  Rate your skills on a scale of 1-10 and specify your experience.
                </p>
              </div>
              <div className="space-y-6">
                {(data.skills || []).map((skill, idx) => (
                  <Card
                    key={idx}
                    className="bg-gray-50 border-gray-200 p-6 rounded-2xl space-y-6"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <Input
                        value={skill.name || ""}
                        onChange={(e) => {
                          if (isReadOnly) return;
                          const newSkills = [...(data.skills || [])];
                          newSkills[idx].name = e.target.value;
                          updateLocalData({ skills: newSkills });
                        }}
                        placeholder="Skill Name (e.g. Electrical)"
                        className="bg-transparent border-none text-xl font-black p-0 h-auto focus-visible:ring-0 placeholder:text-gray-300"
                        disabled={isReadOnly}
                      />
                      {!isReadOnly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newSkills = (data.skills || []).filter((_, i) => i !== idx);
                            updateLocalData({ skills: newSkills });
                          }}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-12">
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                            Proficiency (1-10)
                          </label>
                          <span className="text-xl font-black italic">
                            {skill.proficiency || 5}/10
                          </span>
                        </div>
                        <Slider
                          value={[skill.proficiency || 5]}
                          max={10}
                          min={1}
                          step={1}
                          onValueChange={([val]) => {
                            if (isReadOnly) return;
                            const newSkills = [...(data.skills || [])];
                            newSkills[idx].proficiency = val;
                            updateLocalData({ skills: newSkills });
                          }}
                          className="py-4"
                          disabled={isReadOnly}
                        />
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          Years Active
                        </label>
                        <div className="flex items-center gap-4">
                          <Input
                            type="number"
                            value={skill.years || 0}
                            onChange={(e) => {
                              if (isReadOnly) return;
                              const newSkills = [...(data.skills || [])];
                              newSkills[idx].years = Number.parseInt(e.target.value) || 0;
                              updateLocalData({ skills: newSkills });
                            }}
                            className="bg-gray-100 border-gray-200 h-12 w-24 rounded-xl font-black text-center"
                            disabled={isReadOnly}
                          />
                          <span className="text-sm font-bold text-gray-500">
                            Professional experience
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                {!isReadOnly && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      updateLocalData({
                        skills: [...(data.skills || []), { name: "", proficiency: 5, years: 0 }],
                      })
                    }
                    className="w-full h-14 border-dashed border-gray-200 bg-transparent hover:bg-gray-100 hover:border-gray-300 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Skill
                  </Button>
                )}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tighter uppercase italic">
                  Service Rates & Terms
                </h2>
                <p className="text-gray-500 font-medium">
                  Define your standard fees and project-based pricing.
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="p-6 bg-gray-50 border-gray-200 rounded-2xl space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Hourly Rate ($)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="number"
                      value={data.rate} // ✅ Correct: uses 'rate' from schema
                      onChange={(e) => !isReadOnly && updateLocalData({ rate: Number(e.target.value) })}
                      className="pl-9 bg-gray-100 border-none h-12 text-xl font-black rounded-xl"
                      disabled={isReadOnly}
                    />
                  </div>
                </Card>
                <Card className="p-6 bg-gray-50 border-gray-200 rounded-2xl space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Min. Call-out Fee ($)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="number"
                      value={data.minCallOutFee}
                      onChange={(e) => !isReadOnly && updateLocalData({ minCallOutFee: Number(e.target.value) })}
                      className="pl-9 bg-gray-100 border-none h-12 text-xl font-black rounded-xl"
                      disabled={isReadOnly}
                    />
                  </div>
                </Card>
                <Card className="p-6 bg-gray-50 border-gray-200 rounded-2xl space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Travel Fee ($/km)
                  </label>
                  <div className="relative">
                    <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="number"
                      value={data.travelFeePerKm}
                      onChange={(e) => !isReadOnly && updateLocalData({ travelFeePerKm: Number(e.target.value) })}
                      className="pl-9 bg-gray-100 border-none h-12 text-xl font-black rounded-xl"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-bold text-gray-500">
                    <span>Beyond</span>
                    <Input
                      type="number"
                      value={data.travelThresholdKm}
                      onChange={(e) => !isReadOnly && updateLocalData({ travelThresholdKm: Number(e.target.value) })}
                      className="w-10 h-5 bg-gray-100 border-none p-1 text-center"
                      disabled={isReadOnly}
                    />
                    <span>km</span>
                  </div>
                </Card>
              </div>

              <div className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                  Fixed-Rate Projects
                </h3>
                {(data.fixedRateProjects || []).map((project, idx) => (
                  <Card
                    key={idx}
                    className="bg-gray-50 border-gray-200 p-6 rounded-2xl space-y-4"
                  >
                    <div className="flex justify-between gap-4">
                      <Input
                        value={project.name || ""}
                        onChange={(e) => {
                          if (isReadOnly) return;
                          const newProjects = [...(data.fixedRateProjects || [])];
                          newProjects[idx].name = e.target.value;
                          updateLocalData({ fixedRateProjects: newProjects });
                        }}
                        placeholder="Project Name"
                        className="bg-transparent border-none text-lg font-black p-0 h-auto focus-visible:ring-0"
                        disabled={isReadOnly}
                      />
                      {!isReadOnly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newProjects = (data.fixedRateProjects || []).filter(
                              (_, i) => i !== idx
                            );
                            updateLocalData({ fixedRateProjects: newProjects });
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid md:grid-cols-[1fr_150px] gap-6">
                      <Textarea
                        value={project.details || ""}
                        onChange={(e) => {
                          if (isReadOnly) return;
                          const newProjects = [...(data.fixedRateProjects || [])];
                          newProjects[idx].details = e.target.value;
                          updateLocalData({ fixedRateProjects: newProjects });
                        }}
                        placeholder="Project details and scope..."
                        className="bg-gray-100 border-gray-200 rounded-xl resize-none h-20"
                        disabled={isReadOnly}
                      />
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                          Rate ($)
                        </label>
                        <Input
                          type="number"
                          value={project.rate || 0}
                          onChange={(e) => {
                            if (isReadOnly) return;
                            const newProjects = [...(data.fixedRateProjects || [])];
                            newProjects[idx].rate = Number(e.target.value);
                            updateLocalData({ fixedRateProjects: newProjects });
                          }}
                          className="bg-gray-100 border-gray-200 h-12 text-lg font-black rounded-xl"
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
                {!isReadOnly && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      updateLocalData({
                        fixedRateProjects: [
                          ...(data.fixedRateProjects || []),
                          { name: "", details: "", rate: 0 },
                        ],
                      })
                    }
                    className="w-full h-12 border-dashed border-gray-200 bg-transparent hover:bg-gray-100 rounded-2xl font-black uppercase text-[10px] tracking-widest"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Fixed-Rate Project
                  </Button>
                )}
              </div>
              <div className="p-6 bg-red-50 border border-red-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-red-700 font-black uppercase tracking-tighter italic text-xs">
                  <ShieldCheck className="w-4 h-4" /> Professional Rate Agreement
                </div>
                <p className="text-[10px] font-medium text-red-600 leading-relaxed italic">
                  Rate information must be finalized with full mutual agreement...
                </p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black tracking-tighter uppercase italic">
                  Portfolio & Work Samples
                </h2>
                {!isReadOnly && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      updateLocalData({
                        portfolios: [
                          ...(data.portfolios || []),
                          { title: "", description: "", images: [] },
                        ],
                      })
                    }
                    className="h-10 bg-gray-100 border-gray-200 font-black uppercase text-[10px]"
                  >
                    <Plus className="w-4 h-4 mr-2" /> New Project
                  </Button>
                )}
              </div>
              <div className="space-y-8">
                {(data.portfolios || []).map((project, pIdx) => (
                  <Card
                    key={pIdx}
                    className="bg-gray-50 border-gray-200 p-8 rounded-3xl space-y-6"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-4 flex-1">
                        <Input
                          value={project.title || ""}
                          onChange={(e) => {
                            if (isReadOnly) return;
                            const newPortfolios = [...(data.portfolios || [])];
                            newPortfolios[pIdx].title = e.target.value;
                            updateLocalData({ portfolios: newPortfolios });
                          }}
                          placeholder="Project Title"
                          className="bg-transparent border-none text-2xl font-black p-0 h-auto focus-visible:ring-0"
                          disabled={isReadOnly}
                        />
                        <Textarea
                          value={project.description || ""}
                          onChange={(e) => {
                            if (isReadOnly) return;
                            const newPortfolios = [...(data.portfolios || [])];
                            newPortfolios[pIdx].description = e.target.value;
                            updateLocalData({ portfolios: newPortfolios });
                          }}
                          placeholder="Describe the work, techniques used, and outcome..."
                          className="bg-gray-100 border-gray-200 rounded-xl min-h-[100px]"
                          disabled={isReadOnly}
                        />
                      </div>
                      {!isReadOnly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newPortfolios = (data.portfolios || []).filter(
                              (_, i) => i !== pIdx
                            );
                            updateLocalData({ portfolios: newPortfolios });
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                        Project Images ({project.images?.length || 0}/10)
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {project.images?.map((img, iIdx) => (
                          <div
                            key={iIdx}
                            className="aspect-square bg-gray-100 border border-gray-200 rounded-xl overflow-hidden relative group"
                          >
                            <img
                              src={img}
                              className="w-full h-full object-cover opacity-60 group-hover:opacity-100"
                              onError={(e) => {
                                e.target.src = "/placeholder.svg";
                              }}
                            />
                            {!isReadOnly && (
                              <button
                                onClick={() => {
                                  const newPortfolios = [...(data.portfolios || [])];
                                  newPortfolios[pIdx].images = newPortfolios[pIdx].images.filter(
                                    (_, i) => i !== iIdx
                                  );
                                  updateLocalData({ portfolios: newPortfolios });
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-black/10 text-gray-800 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        {(!isReadOnly && (!project.images || project.images.length < 10)) && (
                          <label className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100">
                            <Plus className="w-6 h-6 text-gray-400" />
                            <input
                              type="file"
                              className="hidden"
                              multiple
                              accept="image/*"
                              onChange={(e) => {
                                if (isReadOnly) return;
                                const files = Array.from(e.target.files || []);
                                if (files.length > 0) {
                                  const newPortfolios = [...(data.portfolios || [])];
                                  const remainingSlots = 10 - (newPortfolios[pIdx]?.images?.length || 0);
                                  const imagesToAdd = files
                                    .slice(0, remainingSlots)
                                    .map((file) => URL.createObjectURL(file));
                                  newPortfolios[pIdx] = {
                                    ...newPortfolios[pIdx],
                                    images: [
                                      ...(newPortfolios[pIdx]?.images || []),
                                      ...imagesToAdd,
                                    ],
                                  };
                                  updateLocalData({ portfolios: newPortfolios });
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-3xl font-black tracking-tighter uppercase italic">
                Operational Range
              </h2>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-2">
                    Primary Base Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      value={(data.serviceAreas?.[0]?.address) || ""}
                      onChange={(e) => {
                        if (isReadOnly) return;
                        const newServiceAreas = [...(data.serviceAreas || [])];
                        newServiceAreas[0] = {
                          ...(newServiceAreas[0] || {}),
                          address: e.target.value,
                        };
                        updateLocalData({ serviceAreas: newServiceAreas });
                      }}
                      placeholder="Search address..."
                      className="pl-12 bg-gray-100 border-gray-200 h-14 rounded-xl text-lg font-black"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                {!isReadOnly && (
                  <Button
                    type="button"
                    onClick={async () => {
                      if ("geolocation" in navigator) {
                        try {
                          const position = await new Promise((resolve, reject) =>
                            navigator.geolocation.getCurrentPosition(resolve, reject)
                          );
                          const { latitude, longitude } = position.coords;
                          const reverseGeocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
                          const res = await fetch(reverseGeocodeUrl);
                          const geoData = await res.json();
                          const address = geoData.display_name || `${latitude}, ${longitude}`;
                          const newServiceAreas = [...(data.serviceAreas || [])];
                          newServiceAreas[0] = {
                            ...(newServiceAreas[0] || {}),
                            address,
                            coordinates: [latitude, longitude],
                          };
                          updateLocalData({ serviceAreas: newServiceAreas });
                        } catch (err) {
                          toast.error("Failed to get current location");
                        }
                      } else {
                        toast.error("Geolocation not supported");
                      }
                    }}
                    className="h-14 px-4 bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-700 font-black uppercase text-[10px]"
                  >
                    Use Current Location
                  </Button>
                )}
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Service Radius
                  </label>
                  <span className="text-2xl font-black italic">
                    {(data.serviceAreas?.[0]?.radiusKm) || 0} km
                  </span>
                </div>
                <Slider
                  value={[(data.serviceAreas?.[0]?.radiusKm) || 5]}
                  max={200}
                  min={5}
                  step={5}
                  onValueChange={([val]) => {
                    if (isReadOnly) return;
                    const newServiceAreas = [...(data.serviceAreas || [])];
                    newServiceAreas[0] = {
                      ...(newServiceAreas[0] || { coordinates: [] }),
                      radiusKm: val,
                    };
                    updateLocalData({ serviceAreas: newServiceAreas });
                  }}
                  className="py-4"
                  disabled={isReadOnly}
                />
              </div>
              <div className="aspect-[16/7] rounded-3xl overflow-hidden border border-gray-200">
                <MapWithCoverage
                  isReadOnly={isReadOnly}
                  address={(data.serviceAreas?.[0]?.address) || ""}
                  coordinates={data.serviceAreas?.[0]?.coordinates || null}
                  radiusKm={data.serviceAreas?.[0]?.radiusKm || 5}
                  onLocationSelect={({ lat, lng, address }) => {
                    const newServiceAreas = [...(data.serviceAreas || [])];
                    newServiceAreas[0] = {
                      ...(newServiceAreas[0] || {}),
                      address,
                      coordinates: [lat, lng],
                    };
                    updateLocalData({ serviceAreas: newServiceAreas });
                  }}
                />
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 overflow-y-auto max-h-[600px] pr-4">
              <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tighter uppercase italic">
                  Verification Summary
                </h2>
                <p className="text-gray-500 font-medium">
                  Review your professional profile before final submission.
                </p>
              </div>
              <div className="space-y-10">
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-2">
                    1. Identity & Bio
                  </h3>
                  <div className="p-6 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
                    <p className="text-2xl font-black italic tracking-tighter">
                      {data.headline || "Unspecified Headline"}
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed font-medium">
                      {data.workDescription || "No professional bio provided."}
                    </p>
                  </div>
                </section>
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-2">
                    2. Technical Skills
                  </h3>
                  <div className="grid gap-3">
                    {(data.skills || []).map((skill, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl"
                      >
                        <span className="font-black text-gray-800">{skill.name}</span>
                        <div className="flex gap-4 items-center">
                          <Badge className="bg-gray-100 text-gray-800 italic font-black">
                            Lvl {skill.proficiency}/10
                          </Badge>
                          <Badge variant="outline" className="border-gray-200 text-gray-500">
                            {skill.years} Yrs
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-2">
                    3. Financial Framework
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                      <p className="text-[8px] font-black text-gray-400 uppercase">Hourly Rate</p>
                      <p className="text-lg font-black">${data.rate}/hr</p> {/* ✅ Uses 'rate' */}
                    </div>
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                      <p className="text-[8px] font-black text-gray-400 uppercase">Call-out</p>
                      <p className="text-lg font-black">${data.minCallOutFee}</p>
                    </div>
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                      <p className="text-[8px] font-black text-gray-400 uppercase">Travel Fee</p>
                      <p className="text-lg font-black">${data.travelFeePerKm}/km</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[8px] font-black text-gray-400 uppercase">Fixed Projects</p>
                    {(data.fixedRateProjects || []).map((p, i) => (
                      <div
                        key={i}
                        className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex justify-between items-center"
                      >
                        <div className="space-y-1">
                          <p className="font-bold text-sm">{p.name}</p>
                          <p className="text-[10px] text-gray-500 line-clamp-1">{p.details}</p>
                        </div>
                        <p className="font-black text-lg">${p.rate}</p>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-2">
                    4. Portfolio Showcase
                  </h3>
                  <div className="space-y-4">
                    {(data.portfolios || []).map((p, i) => (
                      <div
                        key={i}
                        className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3"
                      >
                        <div className="flex justify-between items-center">
                          <p className="font-black italic uppercase tracking-tighter text-sm">
                            {p.title}
                          </p>
                          <Badge className="bg-gray-100 text-gray-500 text-[8px]">
                            {p.images?.length || 0} Images
                          </Badge>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {p.images?.map((img, ii) => (
                            <img
                              key={ii}
                              src={img}
                              className="w-12 h-12 object-cover rounded-lg border border-gray-200 shrink-0"
                              onError={(e) => {
                                e.target.src = "/placeholder.svg";
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <div className="pt-6">
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl flex gap-4">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-medium text-emerald-700 leading-relaxed italic">
                    By submitting this application, you verify that all technical details...
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-10 border-t border-gray-200 mt-10">
          <Button
            onClick={prevStep}
            disabled={currentStep === 0}
            variant="ghost"
            className="text-gray-500 hover:text-gray-900 font-black uppercase tracking-widest text-[10px] disabled:opacity-0"
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button
            onClick={currentStep === 5 ? handleSubmitVerification : nextStep}
            disabled={isSaving || isReadOnly}
            className="bg-black text-white font-black uppercase tracking-widest text-[10px] px-8 py-6 rounded-2xl hover:scale-105 transition-transform disabled:opacity-50"
          >
            {isSaving ? (
              "Saving..."
            ) : currentStep === 5 ? (
              "Submit Verification"
            ) : (
              "Next Step"
            )}{" "}
            {currentStep !== 5 && <ChevronRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </Card>
    </div>
  );
}