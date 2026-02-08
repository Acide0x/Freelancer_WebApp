// src/pages/WorkersPage.jsx
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LayoutGrid, List, Star, Loader2 } from "lucide-react";
import { Toaster } from "sonner";
import api from "@/api/api"; // Your Axios instance

// REMOVE mockWorkers

const Header = ({ variant }) => (
  <header className="bg-background border-b border-border py-4 px-6">
    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
      Hire Professionals
    </h1>
  </header>
);

function WorkerCard({ id, name, avatar, headline, primarySkill, experience, rating, reviewsCount }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-blue-500 hover:shadow-lg transition-all duration-300">
      <div className="flex gap-4 mb-4">
        <img
          src={avatar || "/placeholder.svg"}
          alt={name}
          className="w-16 h-16 rounded-full object-cover border border-border"
        />
        <div className="flex-1">
          <h3 className="font-bold text-foreground text-lg">{name}</h3>
          {/* ✅ Show HEADLINE here (not skill) */}
          <p className="text-sm text-blue-600 font-medium mb-1">{headline}</p>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < Math.floor(rating)
                    ? "text-green-500 fill-green-500"
                    : i < rating
                      ? "text-green-300 fill-green-300"
                      : "text-foreground/30"
                    }`}
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-foreground">{rating.toFixed(1)}</span>
            <span className="text-sm text-foreground/60">({reviewsCount})</span>
          </div>
        </div>
      </div>

      {/* Optional: show primary skill in tags if desired */}
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
          {primarySkill}
        </span>
        <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
          {experience}+ years
        </span>
      </div>

      <Button
        className="w-full bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 text-white"
        onClick={() => window.location.href = `/provider/${id}`}
      >
        View Profile
      </Button>
    </div>
  );
}

function WorkerFilterSidebar({ onFiltersChange }) {
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedRating, setSelectedRating] = useState(0);

  const handleSkillChange = (skill) => {
    const updated = selectedSkills.includes(skill)
      ? selectedSkills.filter((s) => s !== skill)
      : [...selectedSkills, skill];
    setSelectedSkills(updated);
    onFiltersChange({
      skills: updated,
      location: "",
      priceRange: [0, 5000],
      rating: selectedRating,
    });
  };

  const handleRatingChange = (rating) => {
    setSelectedRating(rating);
    onFiltersChange({
      skills: selectedSkills,
      location: "",
      priceRange: [0, 5000],
      rating: rating,
    });
  };

  // Fetch unique skills from backend? Or keep static for now
  const skills = ["Carpentry", "Plumbing", "Electrical", "Painting", "HVAC", "Welding", "Cooking", "Auto Repair"];
  const ratings = [4, 4.5, 4.7, 4.8, 4.9];

  return (
    <div className="bg-card border border-border rounded-xl p-6 h-fit sticky top-8 w-64">
      <h3 className="font-bold text-foreground text-lg mb-5">Filters</h3>

      <div className="mb-6">
        <h4 className="font-semibold text-foreground text-sm mb-3">Skills</h4>
        <div className="space-y-2.5">
          {skills.map((skill) => (
            <label key={skill} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedSkills.includes(skill)}
                onChange={() => handleSkillChange(skill)}
                className="w-4 h-4 rounded border-border text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-foreground/80">{skill}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h4 className="font-semibold text-foreground text-sm mb-3">Minimum Rating</h4>
        <div className="space-y-2.5">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="rating"
              checked={selectedRating === 0}
              onChange={() => handleRatingChange(0)}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm text-foreground/80">All ratings</span>
          </label>
          {ratings.map((rating) => (
            <label key={rating} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="rating"
                checked={selectedRating === rating}
                onChange={() => handleRatingChange(rating)}
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

      <Button
        variant="outline"
        className="w-full border-border text-foreground hover:bg-blue-50 hover:text-blue-700"
        size="sm"
        onClick={() => {
          setSelectedSkills([]);
          setSelectedRating(0);
          onFiltersChange({ skills: [], location: "", priceRange: [0, 5000], rating: 0 });
        }}
      >
        Reset Filters
      </Button>
    </div>
  );
}

export default function WorkersPage() {
  const [viewMode, setViewMode] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    skills: [],
    location: "",
    priceRange: [0, 5000],
    rating: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [workers, setWorkers] = useState([]); // ← Real data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch providers on mount
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setLoading(true);
        const response = await api.get("/users/providers");
        setWorkers(response.data.providers || []);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch providers:", err);
        setError("Failed to load professionals. Please try again later.");
        setWorkers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, []);

  // Apply filters & search
  const filteredWorkers = workers.filter((worker) => {
    const matchesSearch =
      (worker.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (worker.skill || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (worker.tagline || "").toLowerCase().includes(searchTerm.toLowerCase());
    
      const matchesSkills =
      filters.skills.length === 0 ||
      filters.skills.some((skill) => worker.skill.toLowerCase().includes(skill.toLowerCase()));

    const matchesRating = filters.rating === 0 || worker.rating >= filters.rating;

    return matchesSearch && matchesSkills && matchesRating;
  });

  const sortedWorkers = [...filteredWorkers].sort((a, b) => b.rating - a.rating);
  const workersPerPage = 20;
  const totalPages = Math.ceil(sortedWorkers.length / workersPerPage);
  const paginatedWorkers = sortedWorkers.slice(
    (currentPage - 1) * workersPerPage,
    currentPage * workersPerPage
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-foreground/70">Loading professionals...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
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
    );
  }

  return (
    <>
      <Toaster />
      <Header variant="client" />
      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="bg-card border-b border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Hire Skilled Professionals
            </h1>
            <p className="text-foreground/70 mb-6 max-w-2xl">
              Find and connect with experienced professionals ready to complete your projects
            </p>
            <div className="flex gap-3 max-w-2xl">
              <Input
                type="text"
                placeholder="Search worker name, skill, service..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex-1 h-12 text-base"
              />
              <Button className="h-12 px-6 bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 text-white">
                Search
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row gap-8">
            <aside className="hidden md:block">
              <WorkerFilterSidebar onFiltersChange={setFilters} />
            </aside>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <div className="text-sm text-foreground/70">
                  Showing <span className="font-semibold text-foreground">{paginatedWorkers.length}</span> of{" "}
                  <span className="font-semibold text-foreground">{sortedWorkers.length}</span> professionals
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2.5 rounded-lg transition-colors ${viewMode === "grid"
                      ? "bg-blue-600 text-white"
                      : "bg-muted text-foreground/70 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                  >
                    <LayoutGrid className="w-4.5 h-4.5" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2.5 rounded-lg transition-colors ${viewMode === "list"
                      ? "bg-blue-600 text-white"
                      : "bg-muted text-foreground/70 hover:bg-blue-50 hover:text-blue-600"
                      }`}
                  >
                    <List className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {paginatedWorkers.length > 0 ? (
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 md:grid-cols-2 gap-6"
                      : "flex flex-col gap-6"
                  }
                >
                  {paginatedWorkers.map((worker) => (
                    <WorkerCard key={worker.id} {...worker} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-foreground/70 mb-4">No professionals found matching your criteria</p>
                  <Button
                    variant="outline"
                    className="border-border text-foreground hover:bg-blue-50 hover:text-blue-700"
                    onClick={() => {
                      setSearchTerm("");
                      setFilters({ skills: [], location: "", priceRange: [0, 5000], rating: 0 });
                      setCurrentPage(1);
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}

              {sortedWorkers.length > 0 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <Button
                    variant="outline"
                    className="border-border text-foreground hover:bg-blue-50"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .slice(Math.max(0, currentPage - 2), Math.min(totalPages, currentPage + 1))
                    .map((page) => (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "outline"}
                        className={
                          page === currentPage
                            ? "bg-gradient-to-r from-blue-600 to-green-500 text-white"
                            : "border-border text-foreground hover:bg-blue-50"
                        }
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                  <Button
                    variant="outline"
                    className="border-border text-foreground hover:bg-blue-50"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
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