// src/pages/ProviderProfile.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Star, MapPin, CheckCircle, MessageSquare, Share2, Heart, ChevronLeft, X, Loader2 } from "lucide-react";
import { Toaster, toast } from "sonner";
import api from "@/api/api";

// ============================================================================
// TRANSFORM BACKEND DATA TO FRONTEND FORMAT
// ============================================================================
const transformProvider = (backendData) => {
  if (!backendData) return null;
  const provider = backendData.provider || backendData;

  return {
    // 🔑 Expose both ID formats for backend compatibility
    id: provider.id || provider._id,
    _id: provider._id || provider.id,

    name: provider.name || provider.fullName || "Unnamed Professional",
    avatar: provider.avatar || "/placeholder.svg",
    phone: provider.phone || null,

    headline: provider.headline || provider.providerDetails?.headline || `${provider.name || "Professional"} - Services`,
    bio: provider.bio || null,
    workDescription: provider.workDescription || provider.providerDetails?.workDescription || provider.bio || "",

    isVerified: provider.isVerified || provider.providerDetails?.isVerified || false,
    kycVerified: provider.kycVerified || false,
    availabilityStatus: provider.availabilityStatus || provider.providerDetails?.availabilityStatus || "offline",

    skills: provider.skills || provider.providerDetails?.skills?.map((skill) => ({
      name: skill.name,
      proficiency: skill.proficiency,
      years: skill.years,
    })) || [],

    experienceYears: provider.experienceYears || provider.providerDetails?.experienceYears || 0,
    certifications: provider.certifications || provider.providerDetails?.certifications || [],

    rate: Number(provider.rate) || Number(provider.providerDetails?.rate) || 0,
    minCallOutFee: Number(provider.minCallOutFee) || Number(provider.providerDetails?.minCallOutFee) || 0,
    travelFeePerKm: Number(provider.travelFeePerKm) || Number(provider.providerDetails?.travelFeePerKm) || 0,
    travelThresholdKm: Number(provider.travelThresholdKm) || Number(provider.providerDetails?.travelThresholdKm) || 0,
    fixedRateProjects: provider.fixedRateProjects || provider.providerDetails?.fixedRateProjects || [],

    location: typeof provider.location === 'string'
      ? provider.location
      : provider.location?.address
      || [provider.location?.city, provider.location?.state, provider.location?.country].filter(Boolean).join(', ')
      || "Location not specified",
    locationDetails: provider.location || {},
    coordinates: provider.location?.coordinates || provider.coordinates || null,

    serviceAreas: provider.serviceAreas?.map((area) => ({
      city: area.city || area.address,
      radius: area.radius || area.radiusKm,
      coordinates: area.coordinates,
    })) || provider.providerDetails?.serviceAreas?.map((area) => ({
      city: area.address,
      radius: area.radiusKm,
      coordinates: area.coordinates,
    })) || [],

    portfolio: provider.portfolio?.map((item) => ({
      title: item.title,
      image: item.image || item.images?.[0] || "/placeholder.svg",
      images: item.images || [],
      description: item.description,
    })) || provider.providerDetails?.portfolios?.map((item) => ({
      title: item.title,
      image: item.images?.[0] || "/placeholder.svg",
      images: item.images || [],
      description: item.description,
    })) || [],

    rating: Number(provider.rating) || Number(provider.ratings?.average) || 0,
    reviewsCount: Number(provider.reviewsCount) || Number(provider.ratings?.count) || 0,
    reviews: provider.reviews?.map((review) => ({
      id: review.id || review._id,
      clientName: review.clientName || review.reviewerName || "Anonymous",
      rating: review.rating,
      comment: review.comment,
      date: review.date,
    })) || [],

    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
    lastLoginAt: provider.lastLoginAt,
  };
};

// ============================================================================
// REUSABLE COMPONENTS
// ============================================================================

function ReviewCard({ review }) {
  return (
    <Card className="p-5 border border-border">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-foreground">{review.clientName}</p>
          <p className="text-xs text-foreground/60">{new Date(review.date).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${i < Math.floor(review.rating)
                ? "text-green-500 fill-green-500"
                : i < review.rating
                  ? "text-green-300 fill-green-300"
                  : "text-foreground/30"
                }`}
            />
          ))}
        </div>
      </div>
      <p className="text-sm text-foreground/80 line-clamp-3">{review.comment}</p>
    </Card>
  );
}

function SkillItem({ skill }) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-foreground">{skill.name}</span>
        <span className="text-xs text-foreground/60">{skill.years} yrs</span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-600 to-green-500 transition-all duration-500"
          style={{ width: `${(skill.proficiency / 10) * 100}%` }}
        />
      </div>
      <p className="text-xs text-foreground/60 mt-1">{skill.proficiency}/10 proficiency</p>
    </div>
  );
}

function PortfolioGallery({ portfolio }) {
  const [selectedImage, setSelectedImage] = useState(null);
  if (!portfolio || portfolio.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {portfolio.map((item, idx) => (
          <div
            key={idx}
            onClick={() => setSelectedImage(idx)}
            className="relative overflow-hidden rounded-lg cursor-pointer group aspect-square bg-muted"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setSelectedImage(idx)}
          >
            <img
              src={item.image || "/placeholder.svg"}
              alt={item.title || `Portfolio ${idx + 1}`}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              onError={(e) => { e.target.src = "/placeholder.svg"; }}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-start p-3">
              <p className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity line-clamp-2">
                {item.title}
              </p>
            </div>
          </div>
        ))}
      </div>

      {selectedImage !== null && portfolio[selectedImage] && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white hover:bg-white/20 p-2 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={portfolio[selectedImage].image || "/placeholder.svg"}
              alt={portfolio[selectedImage].title || "Portfolio"}
              className="w-full rounded-lg"
              onError={(e) => { e.target.src = "/placeholder.svg"; }}
            />
            {portfolio[selectedImage].title && (
              <p className="text-white text-center mt-3 font-medium">{portfolio[selectedImage].title}</p>
            )}
            {portfolio[selectedImage].description && (
              <p className="text-white/80 text-center text-sm">{portfolio[selectedImage].description}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================================
// BOOKING DIALOG - NO FRONTEND VERIFICATION BLOCKS
// ============================================================================
function BookingDialog({ provider, onClose }) {
  const navigate = useNavigate();
  const [hours, setHours] = useState("10");
  const [description, setDescription] = useState("");
  const [jobTitle, setJobTitle] = useState(`Hire Request: ${provider?.name}`);
  const [urgency, setUrgency] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const rate = Number(provider?.rate) || 0;
  const hoursNum = Number(hours) || 0;
  const totalCost = hoursNum * rate;

  const validate = () => {
    const newErrors = {};
    if (!description.trim()) {
      newErrors.description = "Project description is required";
    } else if (description.trim().length < 20) {
      newErrors.description = "Please provide more details (min 20 characters)";
    }
    if (!hours || hoursNum < 1) {
      newErrors.hours = "Minimum 1 hour required";
    }
    if (!jobTitle.trim()) {
      newErrors.jobTitle = "Job title is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      //  Ensure provider ID is a valid string ObjectId
      const providerId = (provider._id || provider.id)?.toString?.() || (provider._id || provider.id);

      //  MAP skill name to valid category enum
      // ⚠️ CHECK YOUR models/job.model.js FOR EXACT CATEGORY ENUM VALUES
      const skillName = (provider.skills?.[0]?.name || "").toLowerCase().trim();

      // 🔍 REPLACE THESE with values from your Job schema's category enum
      // Example: if your schema has enum: ["general", "electrical_work", "plumbing_work", ...]
      const categoryMap = {
        electrician: "Electrical",
        "electrical work": "Electrical",
        wiring: "Electrical",

        plumber: "Plumbing",
        plumbing: "Plumbing",

        carpenter: "Carpentry",
        carpentry: "Carpentry",

        painter: "Painting",
        painting: "Painting",

        hvac: "HVAC",

        welder: "Welding",
        welding: "Welding",

        cook: "Cooking",
        cooking: "Cooking",

        mechanic: "Mechanic",

        cleaner: "House Help",
        cleaning: "House Help",
      };

      //  Use mapped category or fallback (must exist in your schema)
      const safeCategory = categoryMap[skillName] || "House Help";
      
      //  Build payload - ❌ DO NOT send `status` (backend sets it internally)
      const jobPayload = {
        title: jobTitle.trim(),
        description: description.trim(),
        category: safeCategory, //  Valid enum from mapping
        address: (provider.locationDetails?.address || provider.location || "To be confirmed").trim(),
        city: provider.locationDetails?.city?.trim(),
        state: provider.locationDetails?.state?.trim(),
        country: provider.locationDetails?.country?.trim(),
        budget: Number(totalCost.toFixed(2)),
        estimatedDuration: Number(hoursNum),
        durationUnit: "hours",
        urgency: ["low", "medium", "high"].includes(urgency) ? urgency : "medium",
        assignedWorker: providerId,
        // ❌ REMOVED: status - backend sets it: assignedWorker ? "pending_provider_acceptance" : "open"

        // Optional GeoJSON:
        ...(provider.coordinates && Array.isArray(provider.coordinates) && provider.coordinates.length === 2 && {
          "location.coordinates": [
            Number(provider.coordinates[0]),
            Number(provider.coordinates[1])
          ]
        }),
      };

      console.log("📤 Sending job payload:", jobPayload);
      const { data } = await api.post("/jobs/add", jobPayload);

      if (data?.success) {
        toast.success(`Hire request sent to ${provider.name}!`);
        onClose();
        if (data.flow === "direct_hire" && data.job?._id) {
          navigate(`/jobs/${data.job._id}`);
        } else {
          navigate("/messages");
        }
      } else {
        throw new Error(data?.message || "Failed to create hire request");
      }
    } catch (err) {
      console.error("🔥 Booking error:", err.response?.data);
      const backendData = err.response?.data;
      const errorMsg = backendData?.message || err.message;

      if (backendData?.details?.length > 0) {
        toast.error(
          <div>
            <p className="font-medium mb-1">Validation failed:</p>
            <ul className="text-sm list-disc ml-4 space-y-0.5">
              {backendData.details.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </div>,
          { duration: 10000 }
        );
      } else if (err.response?.status === 401) {
        toast.error("Please log in to hire a provider");
        navigate("/login", { state: { from: `/providers/${provider.id}` } });
      } else if (err.response?.status === 400) {
        toast.error(errorMsg || "Please check your input");
      } else {
        toast.error(errorMsg || "Failed to send hire request");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-md bg-background border-border max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background z-10">
          <h2 className="text-xl font-bold text-foreground">Ready to Hire?</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Job Title */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Job Title</label>
            <Input
              value={jobTitle}
              onChange={(e) => {
                setJobTitle(e.target.value);
                if (errors.jobTitle) setErrors(prev => ({ ...prev, jobTitle: null }));
              }}
              placeholder="e.g., Home Repair, Website Development"
              className={`w-full ${errors.jobTitle ? "border-red-500" : ""}`}
              maxLength={100}
            />
            {errors.jobTitle && <p className="text-xs text-red-500 mt-1">{errors.jobTitle}</p>}
          </div>

          {/* Hours */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Estimated Hours</label>
            <Input
              type="number"
              min="1"
              value={hours}
              onChange={(e) => {
                setHours(e.target.value);
                if (errors.hours) setErrors(prev => ({ ...prev, hours: null }));
              }}
              className={`w-full ${errors.hours ? "border-red-500" : ""}`}
              placeholder="Enter hours"
            />
            {errors.hours && <p className="text-xs text-red-500 mt-1">{errors.hours}</p>}
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Urgency</label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className="w-full p-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low - Flexible timeline</option>
              <option value="medium">Medium - Within a few days</option>
              <option value="high">High - Needed ASAP</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Project Description</label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors(prev => ({ ...prev, description: null }));
              }}
              placeholder="Describe your project, timeline, and specific requirements..."
              className={`w-full p-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-32 ${errors.description ? "border-red-500" : ""}`}
              maxLength={500}
            />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
            <p className="text-xs text-foreground/50 mt-1">{description.length}/500 characters</p>
          </div>

          {/* Cost */}
          <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-foreground/70">Rate:</span>
              <span>Rs. {rate}/hr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/70">Hours:</span>
              <span>{hoursNum} hrs</span>
            </div>
            <div className="flex justify-between font-bold text-foreground pt-2 border-t">
              <span>Estimated Total:</span>
              <span className="text-green-600">Rs. {totalCost.toFixed(2)}</span>
            </div>
          </div>

          {/* Trust */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-1">
            <p className="text-xs text-blue-900 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Payment protected
            </p>
            <p className="text-xs text-blue-900 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Cancel anytime
            </p>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Hire Request"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ProviderProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [showBooking, setShowBooking] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const fetchProvider = async () => {
      if (!id) {
        setError("No provider ID specified");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const { data } = await api.get(`/users/providers/${id}`);
        if (data?.success && data?.data?.provider) {
          const transformed = transformProvider(data.data.provider);
          setProvider(transformed);
          setIsOwner(data.data.meta?.isOwner || false);
        } else {
          throw new Error(data?.message || "Provider not found");
        }
      } catch (err) {
        console.error("Failed to fetch provider:", err);
        if (err.response?.status === 404) setError("Provider not found");
        else if (err.response?.status === 403) setError("This profile is not publicly visible");
        else setError("Failed to load profile");
        toast.error(err.response?.data?.message || "Could not load professional details");
      } finally {
        setLoading(false);
      }
    };
    fetchProvider();
  }, [id]);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${provider?.name}'s Profile`,
          text: provider?.headline,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied!");
      }
    } catch {
      toast.error("Failed to share");
    }
  };

  const handleToggleSave = async () => {
    try {
      setIsSaved(!isSaved);
      toast.success(isSaved ? "Removed from favorites" : "Saved to favorites");
    } catch {
      toast.error("Failed to update favorites");
    }
  };

  //  NO VERIFICATION CHECK - frontend allows hiring any provider
  // ℹ️ Backend will still enforce its own rules (update job.controller.js to remove isVerified check if needed)

  if (loading) {
    return (
      <>
        <Toaster />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-foreground/70 ml-4">Loading...</p>
        </div>
      </>
    );
  }

  if (error || !provider) {
    return (
      <>
        <Toaster />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-8 text-center">
            <p className="text-lg font-semibold">{error || "Profile not found"}</p>
            <Button onClick={() => navigate("/workers")} className="mt-4">
              Browse Professionals
            </Button>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Toaster />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-card border-b border-border px-4 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-foreground/70">
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleToggleSave}>
                <Heart className={`w-4 h-4 ${isSaved ? "fill-red-500 text-red-500" : ""}`} />
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Hero */}
              <div className="text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-start gap-6 mb-6">
                  <img
                    src={provider.avatar || "/placeholder.svg"}
                    alt={provider.name}
                    className="w-24 h-24 rounded-full border-4 border-blue-500 object-cover"
                    onError={(e) => { e.target.src = "/placeholder.svg"; }}
                  />
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-foreground mb-2">{provider.name}</h1>
                    <p className="text-blue-600 font-semibold mb-3">{provider.headline}</p>
                    <div className="flex items-center gap-4 flex-wrap text-sm text-foreground/70">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {provider.location}
                      </div>
                      {provider.phone && (
                        <>
                          <span>•</span>
                          <a href={`tel:${provider.phone}`} className="hover:text-blue-600">
                            {provider.phone}
                          </a>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-4 flex-wrap mt-2">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${i < Math.floor(provider.rating)
                              ? "text-green-500 fill-green-500"
                              : i < provider.rating
                                ? "text-green-300 fill-green-300"
                                : "text-foreground/30"
                              }`}
                          />
                        ))}
                        <span className="ml-2 font-bold">{provider.rating.toFixed(1)}</span>
                        <span className="text-foreground/60">({provider.reviewsCount})</span>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${provider.availabilityStatus === "available"
                          ? "bg-green-100 text-green-700"
                          : provider.availabilityStatus === "busy"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-700"
                          }`}
                      >
                        {provider.availabilityStatus === "available"
                          ? "● Available"
                          : provider.availabilityStatus === "busy"
                            ? "● Busy"
                            : "○ Offline"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 flex-wrap">
                  <Button
                    onClick={() => setShowBooking(true)}
                    className="bg-gradient-to-r from-blue-600 to-green-500 text-white"
                  >
                    Hire Now
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/messages/new?to=${provider.id}`)}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Message
                  </Button>
                </div>
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">Rs. {provider.rate}/hr</p>
                  <p className="text-sm text-foreground/60">Hourly Rate</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600">{provider.experienceYears}+</p>
                  <p className="text-sm text-foreground/60">Years Experience</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-3xl font-bold text-foreground">{provider.serviceAreas.length}</p>
                  <p className="text-sm text-foreground/60">Service Areas</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-3xl font-bold text-purple-600">{provider.certifications.length}</p>
                  <p className="text-sm text-foreground/60">Certifications</p>
                </Card>
              </div>

              {/* About */}
              <section>
                <h2 className="text-2xl font-bold mb-4">About</h2>
                <p className="text-foreground/80 whitespace-pre-wrap">
                  {provider.workDescription || provider.bio || "No bio available."}
                </p>
              </section>

              {/* Skills */}
              {provider.skills?.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold mb-6">Skills</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {provider.skills.map((skill, idx) => (
                      <SkillItem key={idx} skill={skill} />
                    ))}
                  </div>
                </section>
              )}

              {/* Certifications */}
              {provider.certifications?.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold mb-4">Certifications</h2>
                  <div className="flex flex-wrap gap-3">
                    {provider.certifications.map((cert, idx) => (
                      <span
                        key={idx}
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm"
                      >
                        <CheckCircle className="w-3.5 h-3.5 inline mr-1" />
                        {cert}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Portfolio */}
              {provider.portfolio?.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold mb-6">Portfolio</h2>
                  <PortfolioGallery portfolio={provider.portfolio} />
                </section>
              )}

              {/* Reviews */}
              {provider.reviews?.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold mb-6">Reviews</h2>
                  <div className="space-y-4">
                    {provider.reviews.slice(0, 3).map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-1">
              <Card className="sticky top-20 p-6">
                <h3 className="text-lg font-bold mb-4">Quick Hire</h3>
                <div className="space-y-3 mb-6 text-sm">
                  <div className="flex justify-between">
                    <span className="text-foreground/80">Rate:</span>
                    <span className="font-bold text-green-600">Rs. {provider.rate}/hr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/80">Est. 10h:</span>
                    <span className="font-bold">Rs. {(provider.rate * 10).toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  onClick={() => setShowBooking(true)}
                  className="w-full bg-gradient-to-r from-blue-600 to-green-500 text-white mb-3"
                >
                  Hire Now
                </Button>

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-900 space-y-1">
                  <p className="flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Payment protected
                  </p>
                  <p className="flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Cancel anytime
                  </p>
                </div>

                <div className="pt-4 border-t mt-4">
                  <h4 className="font-semibold text-sm mb-2">Service Areas</h4>
                  {provider.serviceAreas.length > 0 ? (
                    provider.serviceAreas.map((area, idx) => (
                      <div key={idx} className="text-sm text-foreground/70 flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 text-orange-500" />
                        <span>{area.city} ({area.radius} km)</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-foreground/50">No service areas specified</p>
                  )}
                </div>
              </Card>
            </aside>
          </div>
        </main>

        {showBooking && <BookingDialog provider={provider} onClose={() => setShowBooking(false)} />}
      </div>
    </>
  );
}