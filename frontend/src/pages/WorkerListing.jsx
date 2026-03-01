// src/pages/WorkersPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { LayoutGrid, List, Star, Loader2, CheckCircle, Clock, MapPin } from "lucide-react";
import { Toaster, toast } from "sonner";
import api from "@/api/api";

const Header = () => (
  <header className="bg-background border-b border-border py-4 px-6 sticky top-0 z-40">
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
        Hire Professionals
      </h1>
    </div>
  </header>
);

// Transform backend provider data to frontend-friendly format
const transformProvider = (provider) => {
  const primarySkill = provider.skills?.[0];
  return {
    id: provider._id || provider.id,
    name: provider.name || "Unnamed Professional",
    avatar: provider.avatar || "/placeholder.svg",
    headline: provider.bio || provider.tagline || "Skilled Professional",
    skills: provider.skills || [],
    primarySkill: primarySkill?.name || primarySkill || "General",
    certifications: provider.certifications || [],
    rate: provider.rate || 0,
    experience: provider.experienceYears || primarySkill?.years || 0,
    rating: provider.rating || 0,
    reviewsCount: provider.reviewsCount || 0,
    availabilityStatus: provider.availabilityStatus || "offline",
    isVerified: provider.isVerified || false,
    location: provider.location || provider.serviceAreas?.[0]?.city || "",
    serviceRadius: provider.serviceAreas?.[0]?.radius || null,
  };
};

function WorkerCard({ worker, viewMode }) {
  const navigate = useNavigate();
  const primarySkill = worker.skills?.[0];

  const getStatusColor = (status) => {
    switch (status) {
      case "available": return "bg-green-100 text-green-700 border-green-200";
      case "busy": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "offline": return "bg-gray-100 text-gray-700 border-gray-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "available": return <CheckCircle className="w-3.5 h-3.5" />;
      case "busy": return <Clock className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  // List View
  if (viewMode === "list") {
    return (
      <Card className="overflow-hidden hover:shadow-md transition-shadow border-border">
        <div className="flex gap-4 p-4">
          <img
            src={worker.avatar || "/placeholder.svg"}
            alt={worker.name}
            className="w-20 h-20 rounded-lg object-cover flex-shrink-0 border border-border"
            onError={(e) => { e.target.src = "/placeholder.svg"; }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-bold text-lg text-foreground truncate">{worker.name}</h3>
                  {worker.isVerified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                      <CheckCircle className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>
                <p className="text-sm text-blue-600 font-medium mb-2 truncate">{worker.headline}</p>

                {/* Skills Tags */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {worker.skills?.slice(0, 3).map((skill, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                      {skill.name} {skill.years ? `(${skill.years}y)` : ""}
                    </span>
                  ))}
                </div>
              </div>

              {/* Rating & Price */}
              <div className="text-right flex-shrink-0">
                <div className="flex items-center justify-end gap-1 mb-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < Math.floor(worker.rating)
                          ? "text-green-500 fill-green-500"
                          : i < worker.rating
                            ? "text-green-300 fill-green-300"
                            : "text-foreground/30"
                        }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold text-foreground">{worker.rating.toFixed(1)}</span>
                <span className="text-xs text-foreground/60"> ({worker.reviewsCount})</span>
                <div className="mt-2 text-right">
                  <span className="text-lg font-bold text-foreground">Rs. {worker.rate}/hr</span>
                </div>
              </div>
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-3 mb-3 text-sm text-foreground/70">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(worker.availabilityStatus)}`}>
                {getStatusIcon(worker.availabilityStatus)}
                {worker.availabilityStatus.charAt(0).toUpperCase() + worker.availabilityStatus.slice(1)}
              </span>
              {worker.experience > 0 && (
                <span>{worker.experience}+ years experience</span>
              )}
              {worker.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {worker.location}
                  {worker.serviceRadius && ` • ${worker.serviceRadius}km`}
                </span>
              )}
            </div>

            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 text-white"
              onClick={() => navigate(`/provider/${worker.id}`)}
            >
              View Profile
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Grid View
  return (
    <Card className="overflow-hidden hover:shadow-lg hover:border-blue-500 transition-all duration-300 flex flex-col border-border">
      <div className="relative">
        <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
          <img
            src={worker.avatar || "/placeholder.svg"}
            alt={worker.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.src = "/placeholder.svg"; }}
          />
        </div>

        {/* Badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
          {worker.isVerified && (
            <span className="inline-flex items-center gap-1 bg-green-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-md">
              <CheckCircle className="w-3.5 h-3.5 fill-white" /> Verified
            </span>
          )}
          <span className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium shadow-md border ${getStatusColor(worker.availabilityStatus)}`}>
            {getStatusIcon(worker.availabilityStatus)}
            {worker.availabilityStatus.charAt(0).toUpperCase() + worker.availabilityStatus.slice(1)}
          </span>
        </div>

        {/* Price Badge */}
        <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border">
          <span className="font-bold text-foreground">Rs. {worker.rate}/hr</span>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="mb-3">
          <h3 className="font-bold text-lg text-foreground mb-1 truncate">{worker.name}</h3>
          <p className="text-sm text-blue-600 font-medium mb-2 line-clamp-2">{worker.headline}</p>

          {/* Rating */}
          <div className="flex items-center gap-1 mb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${i < Math.floor(worker.rating)
                    ? "text-green-500 fill-green-500"
                    : i < worker.rating
                      ? "text-green-300 fill-green-300"
                      : "text-foreground/30"
                  }`}
              />
            ))}
            <span className="text-sm font-semibold text-foreground ml-1">{worker.rating.toFixed(1)}</span>
            <span className="text-sm text-foreground/60">({worker.reviewsCount})</span>
          </div>
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {worker.skills?.slice(0, 2).map((skill, idx) => (
            <span key={idx} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
              {skill.name}
            </span>
          ))}
          {worker.experience > 0 && (
            <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
              {worker.experience}+ yrs
            </span>
          )}
        </div>

        {/* Location */}
        {worker.location && (
          <div className="flex items-center gap-1.5 text-sm text-foreground/70 mb-4">
            <MapPin className="w-4 h-4" />
            <span className="truncate">{worker.location}</span>
            {worker.serviceRadius && <span className="text-xs">({worker.serviceRadius}km)</span>}
          </div>
        )}

        <Button
          className="w-full bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 text-white mt-auto"
          onClick={() => navigate(`/provider/${worker.id}`)}
        >
          View Profile
        </Button>
      </div>
    </Card>
  );
}

function WorkerFilterSidebar({ filters, onFiltersChange, availableSkills }) {
  const handleSkillToggle = (skill) => {
    const updated = filters.skills.includes(skill)
      ? filters.skills.filter((s) => s !== skill)
      : [...filters.skills, skill];
    onFiltersChange({ ...filters, skills: updated });
  };

  const handleAvailabilityToggle = (status) => {
    const updated = filters.availability.includes(status)
      ? filters.availability.filter((s) => s !== status)
      : [...filters.availability, status];
    onFiltersChange({ ...filters, availability: updated });
  };

  const resetFilters = () => {
    onFiltersChange({
      skills: [],
      rating: 0,
      availability: [],
      priceRange: [0, 10000],
      location: "",
    });
  };

  const ratings = [4, 4.5, 4.7, 4.8, 4.9];

  return (
    <aside className="w-72 bg-card border border-border rounded-xl p-6 max-h-[calc(100vh-180px)] overflow-y-auto sticky top-24">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-lg text-foreground">Filters</h3>
        <button
          onClick={resetFilters}
          className="p-1.5 hover:bg-muted rounded-lg transition-colors text-foreground/60 hover:text-foreground"
          title="Reset filters"
        >
          <span className="text-xs font-medium">Reset</span>
        </button>
      </div>

      <div className="space-y-6">
        {/* Skills Filter */}
        <div>
          <h4 className="font-semibold text-foreground text-sm mb-3">Skills</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {(availableSkills.length > 0 ? availableSkills : [
              "Carpentry", "Plumbing", "Electrical", "Painting",
              "HVAC", "Welding", "Cooking", "Auto Repair"
            ]).map((skill) => (
              <label key={skill} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={filters.skills.includes(skill)}
                  onChange={() => handleSkillToggle(skill)}
                  className="w-4 h-4 rounded border-border text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">
                  {skill}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Rating Filter */}
        <div>
          <h4 className="font-semibold text-foreground text-sm mb-3">Minimum Rating</h4>
          <div className="space-y-2.5">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="rating"
                checked={filters.rating === 0}
                onChange={() => onFiltersChange({ ...filters, rating: 0 })}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-foreground/80">All ratings</span>
            </label>
            {ratings.map((rating) => (
              <label key={rating} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="rating"
                  checked={filters.rating === rating}
                  onChange={() => onFiltersChange({ ...filters, rating })}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${i < Math.floor(rating)
                          ? "text-green-500 fill-green-500"
                          : i < rating
                            ? "text-green-300 fill-green-300"
                            : "text-foreground/30"
                        }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-foreground/80">{rating}+</span>
              </label>
            ))}
          </div>
        </div>

        {/* Availability Filter */}
        <div>
          <h4 className="font-semibold text-foreground text-sm mb-3">Availability</h4>
          <div className="space-y-2.5">
            {["available", "busy"].map((status) => (
              <label key={status} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.availability.includes(status)}
                  onChange={() => handleAvailabilityToggle(status)}
                  className="w-4 h-4 rounded border-border text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-foreground/80 capitalize">{status}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div>
          <h4 className="font-semibold text-foreground text-sm mb-3">Hourly Rate</h4>
          <div className="space-y-2.5">
            {[
              { label: "Under Rs. 500", min: 0, max: 50 },
              { label: "Rs.500 - Rs.1000", min: 50, max: 100 },
              { label: "Rs.1000 - Rs.1500", min: 100, max: 150 },
              { label: "Rs.1500+", min: 150, max: 10000 },
            ].map((range) => (
              <label key={range.label} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="priceRange"
                  checked={filters.priceRange[0] === range.min && filters.priceRange[1] === range.max}
                  onChange={() => onFiltersChange({ ...filters, priceRange: [range.min, range.max] })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-foreground/80">{range.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function WorkersPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState("grid");
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [sortBy, setSortBy] = useState("rating");
  const [filters, setFilters] = useState({
    skills: [],
    rating: 0,
    availability: [],
    priceRange: [0, 10000],
    location: "",
  });
  const [currentPage, setCurrentPage] = useState(1);

  const [workers, setWorkers] = useState([]);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch providers from backend
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get("/users/providers", {
          params: {
            role: "service_provider",
            limit: 100,
          }
        });

        // Safely extract providers array from various possible response structures
        const rawData = response.data;
        let providers = [];

        if (Array.isArray(rawData)) {
          providers = rawData;
        } else if (Array.isArray(rawData?.providers)) {
          providers = rawData.providers;
        } else if (Array.isArray(rawData?.users)) {
          providers = rawData.users;
        } else if (Array.isArray(rawData?.data)) {
          providers = rawData.data;
        } else if (rawData && typeof rawData === 'object') {
          // Handle nested structures like { success: true, data: { providers: [...] } }
          const nested = rawData.data?.providers || rawData.data?.users || rawData.data;
          if (Array.isArray(nested)) {
            providers = nested;
          }
        }

        // Fallback to empty array if nothing matched
        if (!Array.isArray(providers)) {
          console.warn("Unexpected API response format:", rawData);
          providers = [];
        }

        const transformed = providers.map(transformProvider);

        // Extract unique skills for filter sidebar
        const skillsSet = new Set();
        transformed.forEach(worker => {
          worker.skills?.forEach(skill => {
            if (skill?.name) skillsSet.add(skill.name);
          });
        });
        setAvailableSkills(Array.from(skillsSet));

        setWorkers(transformed);
      } catch (err) {
        console.error("Failed to fetch providers:", err);
        setError("Failed to load professionals. Please try again later.");
        toast.error("Could not load professionals");
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, []);

  // Filter and search logic
  const filteredWorkers = useMemo(() => {
    return workers.filter((worker) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        worker.name?.toLowerCase().includes(searchLower) ||
        worker.headline?.toLowerCase().includes(searchLower) ||
        worker.skills?.some(s => s.name?.toLowerCase().includes(searchLower)) ||
        worker.primarySkill?.toLowerCase().includes(searchLower);

      // Skills filter
      const matchesSkills = filters.skills.length === 0 ||
        filters.skills.some(skill =>
          worker.skills?.some(s => s.name?.toLowerCase().includes(skill.toLowerCase()))
        );

      // Rating filter
      const matchesRating = filters.rating === 0 || worker.rating >= filters.rating;

      // Availability filter
      const matchesAvailability = filters.availability.length === 0 ||
        filters.availability.includes(worker.availabilityStatus);

      // Price filter
      const matchesPrice = worker.rate >= filters.priceRange[0] &&
        worker.rate <= filters.priceRange[1];

      // Location filter (basic)
      const matchesLocation = !filters.location ||
        worker.location?.toLowerCase().includes(filters.location.toLowerCase());

      return matchesSearch && matchesSkills && matchesRating &&
        matchesAvailability && matchesPrice && matchesLocation;
    });
  }, [workers, searchTerm, filters]);

  // Sorting logic
  const sortedWorkers = useMemo(() => {
    const sorted = [...filteredWorkers];
    switch (sortBy) {
      case "rating":
        return sorted.sort((a, b) => b.rating - a.rating);
      case "experience":
        return sorted.sort((a, b) => (b.experience || 0) - (a.experience || 0));
      case "price-low":
        return sorted.sort((a, b) => (a.rate || 0) - (b.rate || 0));
      case "price-high":
        return sorted.sort((a, b) => (b.rate || 0) - (a.rate || 0));
      case "name":
        return sorted.sort((a, b) => a.name?.localeCompare(b.name));
      default:
        return sorted;
    }
  }, [filteredWorkers, sortBy]);

  // Pagination
  const workersPerPage = 12;
  const totalPages = Math.ceil(sortedWorkers.length / workersPerPage);
  const paginatedWorkers = sortedWorkers.slice(
    (currentPage - 1) * workersPerPage,
    currentPage * workersPerPage
  );

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters, sortBy]);

  // Loading State
  if (loading) {
    return (
      <>
        <Toaster />
        <Header />
        <main className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-foreground/70">Loading professionals...</p>
          </div>
        </main>
      </>
    );
  }

  // Error State
  if (error) {
    return (
      <>
        <Toaster />
        <Header />
        <main className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center p-6 max-w-md">
            <p className="text-red-500 mb-4">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-blue-600 to-green-500 text-white"
            >
              Retry
            </Button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Toaster />
      <Header />

      <main className="min-h-screen bg-background">
        {/* Search Section */}
        <div className="bg-card border-b border-border sticky top-16 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Search by name, skill, or service..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-11 pl-4 pr-10"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
                >
                  <option value="rating">Sort: Rating</option>
                  <option value="experience">Sort: Experience</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="name">Sort: Name</option>
                </select>

                <div className="flex gap-1 border border-border rounded-lg p-1 bg-background">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded transition-colors ${viewMode === "grid"
                        ? "bg-blue-100 text-blue-600"
                        : "text-foreground/60 hover:text-foreground"
                      }`}
                    title="Grid view"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded transition-colors ${viewMode === "list"
                        ? "bg-blue-100 text-blue-600"
                        : "text-foreground/60 hover:text-foreground"
                      }`}
                    title="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content with Sidebar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Filters Sidebar - Desktop */}
            <div className="hidden lg:block">
              <WorkerFilterSidebar
                filters={filters}
                onFiltersChange={setFilters}
                availableSkills={availableSkills}
              />
            </div>

            {/* Mobile Filters Toggle could go here */}

            {/* Content Area */}
            <div className="flex-1 min-w-0">
              {/* Results Header */}
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-foreground/60">
                  {filteredWorkers.length} {filteredWorkers.length === 1 ? "professional" : "professionals"} found
                </p>

                {/* Active Filters Tags */}
                {(filters.skills.length > 0 || filters.availability.length > 0 || filters.rating > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {filters.skills.map(skill => (
                      <span key={skill} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                        {skill}
                        <button
                          onClick={() => setFilters(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }))}
                          className="hover:text-blue-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {filters.availability.map(status => (
                      <span key={status} className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs capitalize">
                        {status}
                        <button
                          onClick={() => setFilters(prev => ({ ...prev, availability: prev.availability.filter(s => s !== status) }))}
                          className="hover:text-green-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {filters.rating > 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                        {filters.rating}+ ★
                        <button
                          onClick={() => setFilters(prev => ({ ...prev, rating: 0 }))}
                          className="hover:text-yellow-900"
                        >
                          ×
                        </button>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Workers Grid/List */}
              {paginatedWorkers.length > 0 ? (
                <div className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                    : "flex flex-col gap-4"
                }>
                  {paginatedWorkers.map((worker) => (
                    <WorkerCard key={worker.id} worker={worker} viewMode={viewMode} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-card border border-border rounded-xl">
                  <div className="text-foreground/40 mb-4">
                    <LayoutGrid className="w-12 h-12 mx-auto opacity-50" />
                  </div>
                  <p className="text-foreground/70 mb-2 font-medium">No professionals found</p>
                  <p className="text-sm text-foreground/50 mb-4">Try adjusting your search or filters</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setFilters({
                        skills: [],
                        rating: 0,
                        availability: [],
                        priceRange: [0, 10000],
                        location: "",
                      });
                    }}
                  >
                    Clear All Filters
                  </Button>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10 pb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>

                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }).slice(
                      Math.max(0, currentPage - 2),
                      Math.min(totalPages, currentPage + 1)
                    ).map((_, idx) => {
                      const page = Math.max(1, currentPage - 1) + idx;
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={
                            currentPage === page
                              ? "bg-gradient-to-r from-blue-600 to-green-500 text-white"
                              : ""
                          }
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}