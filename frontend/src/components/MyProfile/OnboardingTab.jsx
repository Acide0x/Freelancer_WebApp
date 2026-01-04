// src/components/MyProfile/OnboardingTab.jsx
import React, { useState } from "react";
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
  bio: "",
  skills: [{ name: "General Maintenance", proficiency: 5, years: 2 }],
  rate: 50,
  minCallOutFee: 30,
  travelFeePerKm: 2,
  travelThresholdKm: 15,
  fixedRateProjects: [
    {
      name: "Drain Unclogging",
      details: "Standard residential drain clearing",
      rate: 120,
    },
  ],
  availabilityStatus: "available",
  portfolios: [
    {
      title: "Kitchen Remodel",
      description: "Complete overhaul of a modern kitchen",
      images: ["/portfolio-sample-.jpg"],
    },
  ],
  serviceAreas: [
    {
      address: "San Francisco, CA",
      radiusKm: 25,
      coordinates: [-122.4194, 37.7749],
    },
  ],
  experienceYears: 6,
};

// 🔒 Helper to safely merge incoming data with defaults
const mergeWithDefaults = (incomingData) => {
  return {
    ...defaultOnboardingData,
    ...(incomingData || {}),
    skills: incomingData?.skills ?? defaultOnboardingData.skills,
    fixedRateProjects:
      incomingData?.fixedRateProjects ?? defaultOnboardingData.fixedRateProjects,
    portfolios: incomingData?.portfolios ?? defaultOnboardingData.portfolios,
    serviceAreas: incomingData?.serviceAreas ?? defaultOnboardingData.serviceAreas,
  };
};

export default function OnboardingTab({
  providerStatus,
  onStatusChange,
  onboardingData,
  onUpdateOnboardingData,
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [localOnboardingData, setLocalOnboardingData] = useState(
    mergeWithDefaults(onboardingData)
  );

  const nextStep = () =>
    setCurrentStep((s) => Math.min(s + 1, ONBOARDING_STEPS.length - 1));
  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handleSubmitVerification = () => {
    onStatusChange("pending");
    toast.success("Application submitted for review");
  };

  const updateLocalData = (updates) => {
    const newData = { ...localOnboardingData, ...updates };
    setLocalOnboardingData(newData);
    if (onUpdateOnboardingData) {
      onUpdateOnboardingData(newData);
    }
  };

  const renderSkillsStep = () => {
    // ✅ Defensive fallback
    const skills = localOnboardingData.skills || [];
    return (
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
          {skills.map((skill, idx) => (
            <Card
              key={idx}
              className="bg-gray-50 border-gray-200 p-6 rounded-2xl space-y-6"
            >
              <div className="flex items-center justify-between gap-4">
                <Input
                  value={skill.name}
                  onChange={(e) => {
                    const newSkills = [...skills];
                    newSkills[idx].name = e.target.value;
                    updateLocalData({ skills: newSkills });
                  }}
                  placeholder="Skill Name (e.g. Electrical)"
                  className="bg-transparent border-none text-xl font-black p-0 h-auto focus-visible:ring-0 placeholder:text-gray-300"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const newSkills = skills.filter((_, i) => i !== idx);
                    updateLocalData({ skills: newSkills });
                  }}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                      Proficiency (1-10)
                    </label>
                    <span className="text-xl font-black italic">
                      {skill.proficiency}/10
                    </span>
                  </div>
                  <Slider
                    value={[skill.proficiency]}
                    max={10}
                    min={1}
                    step={1}
                    onValueChange={([val]) => {
                      const newSkills = [...skills];
                      newSkills[idx].proficiency = val;
                      updateLocalData({ skills: newSkills });
                    }}
                    className="py-4"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Years Active
                  </label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      value={skill.years}
                      onChange={(e) => {
                        const newSkills = [...skills];
                        newSkills[idx].years =
                          Number.parseInt(e.target.value) || 0;
                        updateLocalData({ skills: newSkills });
                      }}
                      className="bg-gray-100 border-gray-200 h-12 w-24 rounded-xl font-black text-center"
                    />
                    <span className="text-sm font-bold text-gray-500">
                      Professional experience
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              updateLocalData({
                skills: [
                  ...skills,
                  { name: "", proficiency: 5, years: 0 },
                ],
              })
            }
            className="w-full h-14 border-dashed border-gray-200 bg-transparent hover:bg-gray-100 hover:border-gray-300 rounded-2xl font-black uppercase tracking-widest text-[10px]"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Skill
          </Button>
        </div>
      </div>
    );
  };

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
            onClick={() => onStatusChange("incomplete")}
            variant="ghost"
            className="text-gray-400 hover:text-gray-900 text-[10px] uppercase font-black"
          >
            Cancel & Edit
          </Button>
        </div>
      </Card>
    );
  }

  // ✅ Ensure data integrity for all steps
  const data = localOnboardingData;

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Step Indicator */}
      <div className="flex items-center justify-between relative px-4">
        <div className="absolute top-5 left-0 w-full h-[1px] bg-gray-200 -z-10" />
        {ONBOARDING_STEPS.map((step, idx) => (
          <div key={step.id} className="flex flex-col items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${
                idx <= currentStep
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
              className={`text-[10px] font-black uppercase tracking-widest ${
                idx === currentStep ? "text-black" : "text-gray-400"
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
                    onChange={(e) => updateLocalData({ headline: e.target.value })}
                    placeholder="e.g. Master Plumber with 15 years experience"
                    className="bg-gray-100 border-gray-200 h-14 rounded-xl"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Experience Bio
                  </label>
                  <Textarea
                    value={data.bio}
                    onChange={(e) => updateLocalData({ bio: e.target.value })}
                    placeholder="Describe your background and expertise..."
                    className="bg-gray-100 border-gray-200 min-h-[180px] rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && renderSkillsStep()}

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
                      value={data.rate}
                      onChange={(e) =>
                        updateLocalData({ rate: Number(e.target.value) })
                      }
                      className="pl-9 bg-gray-100 border-none h-12 text-xl font-black rounded-xl"
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
                      onChange={(e) =>
                        updateLocalData({ minCallOutFee: Number(e.target.value) })
                      }
                      className="pl-9 bg-gray-100 border-none h-12 text-xl font-black rounded-xl"
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
                      onChange={(e) =>
                        updateLocalData({ travelFeePerKm: Number(e.target.value) })
                      }
                      className="pl-9 bg-gray-100 border-none h-12 text-xl font-black rounded-xl"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-bold text-gray-500">
                    <span>Beyond</span>
                    <Input
                      type="number"
                      value={data.travelThresholdKm}
                      onChange={(e) =>
                        updateLocalData({ travelThresholdKm: Number(e.target.value) })
                      }
                      className="w-10 h-5 bg-gray-100 border-none p-1 text-center"
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
                        value={project.name}
                        onChange={(e) => {
                          const newProjects = [...(data.fixedRateProjects || [])];
                          newProjects[idx].name = e.target.value;
                          updateLocalData({ fixedRateProjects: newProjects });
                        }}
                        placeholder="Project Name"
                        className="bg-transparent border-none text-lg font-black p-0 h-auto focus-visible:ring-0"
                      />
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
                    </div>
                    <div className="grid md:grid-cols-[1fr_150px] gap-6">
                      <Textarea
                        value={project.details}
                        onChange={(e) => {
                          const newProjects = [...(data.fixedRateProjects || [])];
                          newProjects[idx].details = e.target.value;
                          updateLocalData({ fixedRateProjects: newProjects });
                        }}
                        placeholder="Project details and scope..."
                        className="bg-gray-100 border-gray-200 rounded-xl resize-none h-20"
                      />
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                          Rate ($)
                        </label>
                        <Input
                          type="number"
                          value={project.rate}
                          onChange={(e) => {
                            const newProjects = [...(data.fixedRateProjects || [])];
                            newProjects[idx].rate = Number(e.target.value);
                            updateLocalData({ fixedRateProjects: newProjects });
                          }}
                          className="bg-gray-100 border-gray-200 h-12 text-lg font-black rounded-xl"
                        />
                      </div>
                    </div>
                  </Card>
                ))}
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
              </div>

              <div className="p-6 bg-red-50 border border-red-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-red-700 font-black uppercase tracking-tighter italic text-xs">
                  <ShieldCheck className="w-4 h-4" /> Professional Rate Agreement
                </div>
                <p className="text-[10px] font-medium text-red-600 leading-relaxed italic">
                  Rate information must be finalized with full mutual agreement.
                  Providers may not request additional compensation beyond
                  pre-decided amounts unless a formal scope update is mutually
                  agreed upon with the client. Proof of such agreements must be
                  available for Administrative review in the event of a dispute.
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
                          value={project.title}
                          onChange={(e) => {
                            const newPortfolios = [...(data.portfolios || [])];
                            newPortfolios[pIdx].title = e.target.value;
                            updateLocalData({ portfolios: newPortfolios });
                          }}
                          placeholder="Project Title"
                          className="bg-transparent border-none text-2xl font-black p-0 h-auto focus-visible:ring-0"
                        />
                        <Textarea
                          value={project.description}
                          onChange={(e) => {
                            const newPortfolios = [...(data.portfolios || [])];
                            newPortfolios[pIdx].description = e.target.value;
                            updateLocalData({ portfolios: newPortfolios });
                          }}
                          placeholder="Describe the work, techniques used, and outcome..."
                          className="bg-gray-100 border-gray-200 rounded-xl min-h-[100px]"
                        />
                      </div>
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
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                        Project Images ({project.images.length}/10)
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {project.images.map((img, iIdx) => (
                          <div
                            key={iIdx}
                            className="aspect-square bg-gray-100 border border-gray-200 rounded-xl overflow-hidden relative group"
                          >
                            <img
                              src={img || "/placeholder.svg"}
                              className="w-full h-full object-cover opacity-60 group-hover:opacity-100"
                              onError={(e) => {
                                e.target.src = "/placeholder.svg";
                              }}
                            />
                            <button
                              onClick={() => {
                                const newPortfolios = [...(data.portfolios || [])];
                                newPortfolios[pIdx].images =
                                  newPortfolios[pIdx].images.filter(
                                    (_, i) => i !== iIdx
                                  );
                                updateLocalData({ portfolios: newPortfolios });
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-black/10 text-gray-800 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {project.images.length < 10 && (
                          <label className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100">
                            <Plus className="w-6 h-6 text-gray-400" />
                            <input
                              type="file"
                              className="hidden"
                              multiple
                              accept="image/*"
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length > 0) {
                                  const newPortfolios = [...(data.portfolios || [])];
                                  const remainingSlots = 10 - project.images.length;
                                  const imagesToAdd = files
                                    .slice(0, remainingSlots)
                                    .map((file) => URL.createObjectURL(file)); // ✅ Fixed: use each file
                                  newPortfolios[pIdx].images = [
                                    ...newPortfolios[pIdx].images,
                                    ...imagesToAdd,
                                  ];
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
              <div className="space-y-8">
                <div className="grid gap-4 p-8 bg-gray-50 border border-gray-200 rounded-3xl">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                      Primary Base Location
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        value={(data.serviceAreas?.[0]?.address) || ""}
                        onChange={(e) => {
                          const newServiceAreas = [...(data.serviceAreas || [])];
                          newServiceAreas[0] = {
                            ...(newServiceAreas[0] || {}),
                            address: e.target.value,
                          };
                          updateLocalData({ serviceAreas: newServiceAreas });
                        }}
                        placeholder="Enter your business address"
                        className="pl-12 bg-gray-100 border-gray-200 h-14 rounded-xl text-lg font-black"
                      />
                    </div>
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
                        const newServiceAreas = [...(data.serviceAreas || [])];
                        newServiceAreas[0] = {
                          ...(newServiceAreas[0] || { coordinates: [] }),
                          radiusKm: val,
                        };
                        updateLocalData({ serviceAreas: newServiceAreas });
                      }}
                      className="py-4"
                    />
                  </div>
                </div>
                <div className="aspect-[16/7] bg-gray-100 border border-gray-200 rounded-3xl overflow-hidden relative group">
                  <img
                    src="/service-area-map.jpg"
                    className="object-cover w-full h-full grayscale opacity-40 group-hover:opacity-60 transition-opacity"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/800x300?text=Map+Preview";
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="p-6 bg-white/90 backdrop-blur-xl border border-gray-200 rounded-3xl flex flex-col items-center gap-4 text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center animate-pulse">
                        <Navigation className="w-6 h-6 text-gray-800" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-black uppercase tracking-widest text-gray-500 italic">
                          Coverage Visualized
                        </p>
                        <p className="text-sm font-bold text-gray-900 max-w-[200px]">
                          Coverage area is calculated dynamically from your base address.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
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
                      {data.bio || "No professional bio provided."}
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
                            {p.images.length} Images
                          </Badge>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {p.images.map((img, ii) => (
                            <img
                              key={ii}
                              src={img || "/placeholder.svg"}
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
                    By submitting this application, you verify that all technical details,
                    rates, and portfolio works are authentic and representative of your
                    professional services. SkillLink reserves the right to audit these
                    details during the verification process.
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
            className="bg-black text-white font-black uppercase tracking-widest text-[10px] px-8 py-6 rounded-2xl hover:scale-105 transition-transform"
          >
            {currentStep === 5 ? "Submit Verification" : "Next Step"}{" "}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </Card>
    </div>
  );
}