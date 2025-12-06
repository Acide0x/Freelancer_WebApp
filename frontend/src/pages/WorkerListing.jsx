import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LayoutGrid, List, Star } from "lucide-react";
import { Toaster } from "sonner";

// Mock data (unchanged)
const mockWorkers = [
  {
    id: "1",
    name: "Marcus Johnson",
    avatar: "/professional-carpenter.jpg",
    skill: "Carpentry",
    experience: 12,
    rating: 4.9,
    reviewsCount: 287,
    tagline: "Expert carpenter with 12 years of experience in residential and commercial projects",
  },
  {
    id: "2",
    name: "Sofia Rodriguez",
    avatar: "/professional-plumber.png",
    skill: "Plumbing",
    experience: 8,
    rating: 4.8,
    reviewsCount: 156,
    tagline: "Licensed plumber specializing in emergency repairs and installations",
  },
  {
    id: "3",
    name: "David Chen",
    avatar: "/professional-electrician.png",
    skill: "Electrical",
    experience: 15,
    rating: 4.95,
    reviewsCount: 342,
    tagline: "Certified electrician with expertise in home wiring and solar installations",
  },
  {
    id: "4",
    name: "Jennifer Martinez",
    avatar: "/professional-painter.png",
    skill: "Painting",
    experience: 7,
    rating: 4.7,
    reviewsCount: 198,
    tagline: "Interior and exterior painter with attention to detail and professional finishes",
  },
  {
    id: "5",
    name: "Alex Thompson",
    avatar: "/professional-chef.jpg",
    skill: "Chef",
    experience: 10,
    rating: 4.85,
    reviewsCount: 124,
    tagline: "Professional chef offering private cooking, meal prep, and catering services",
  },
  {
    id: "6",
    name: "Michael Park",
    avatar: "/professional-mechanic.jpg",
    skill: "Mechanic",
    experience: 11,
    rating: 4.82,
    reviewsCount: 267,
    tagline: "ASE-certified mechanic specializing in engine repair and diagnostics",
  },
  {
    id: "7",
    name: "Patricia Williams",
    avatar: "/professional-ac-technician.jpg",
    skill: "AC Technician",
    experience: 9,
    rating: 4.75,
    reviewsCount: 189,
    tagline: "HVAC specialist with expertise in AC installation and maintenance",
  },
  {
    id: "8",
    name: "Robert Coleman",
    avatar: "/professional-welder.jpg",
    skill: "Welder",
    experience: 14,
    rating: 4.9,
    reviewsCount: 211,
    tagline: "Certified welder with experience in metal fabrication and custom projects",
  },
  {
    id: "9",
    name: "Maria Garcia",
    avatar: "/professional-chef.jpg",
    skill: "Chef",
    experience: 6,
    rating: 4.65,
    reviewsCount: 87,
    tagline: "Culinary graduate offering specialized catering and event food services",
  },
  {
    id: "10",
    name: "James Anderson",
    avatar: "/professional-carpenter.jpg",
    skill: "Carpentry",
    experience: 13,
    rating: 4.88,
    reviewsCount: 234,
    tagline: "Skilled carpenter known for custom woodwork and renovation projects",
  },
  {
    id: "11",
    name: "Lisa Chang",
    avatar: "/professional-painter.png",
    skill: "Painting",
    experience: 8,
    rating: 4.72,
    reviewsCount: 143,
    tagline: "Detail-oriented painter offering residential and commercial services",
  },
  {
    id: "12",
    name: "Kevin White",
    avatar: "/professional-electrician.png",
    skill: "Electrical",
    experience: 10,
    rating: 4.8,
    reviewsCount: 198,
    tagline: "Licensed electrician offering residential wiring and troubleshooting",
  },
  {
    id: "13",
    name: "Angela Scott",
    avatar: "/professional-chef.jpg",
    skill: "Chef",
    experience: 12,
    rating: 4.9,
    reviewsCount: 301,
    tagline: "Executive chef with experience in high-end catering and private dining",
  },
  {
    id: "14",
    name: "Thomas Wright",
    avatar: "/professional-plumber.png",
    skill: "Plumbing",
    experience: 11,
    rating: 4.86,
    reviewsCount: 203,
    tagline: "Master plumber offering comprehensive residential plumbing solutions",
  },
  {
    id: "15",
    name: "Rachel Green",
    avatar: "/professional-ac-technician.jpg",
    skill: "AC Technician",
    experience: 7,
    rating: 4.7,
    reviewsCount: 112,
    tagline: "HVAC certified technician with fast response times for AC issues",
  },
];

// Header with SkillLink styling
const Header = ({ variant }) => (
  <header className="bg-background border-b border-border py-4 px-6">
    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
      Hire Professionals
    </h1>
  </header>
);

// WorkerCard with SkillLink branding
function WorkerCard({ id, name, avatar, skill, experience, rating, reviewsCount, tagline }) {
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
          <p className="text-sm text-blue-600 font-medium mb-1">{skill}</p>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(rating)
                      ? "text-green-500 fill-green-500"
                      : i < rating
                      ? "text-green-300 fill-green-300"
                      : "text-foreground/30"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-foreground">{rating}</span>
            <span className="text-sm text-foreground/60">({reviewsCount})</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-foreground/70 line-clamp-2 mb-4">{tagline}</p>

      <div className="flex items-center gap-2 mb-5">
        <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
          {experience}+ years
        </span>
      </div>

      <Button className="w-full bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 text-white">
        View Profile
      </Button>
    </div>
  );
}

// Filter Sidebar styled consistently
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
                    className={`w-3.5 h-3.5 ${
                      i < Math.floor(rating)
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

// Main WorkersPage
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
  const workersPerPage = 20;

  const filteredWorkers = mockWorkers.filter((worker) => {
    const matchesSearch =
      worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.skill.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.tagline.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSkills =
      filters.skills.length === 0 ||
      filters.skills.some((skill) => worker.skill.toLowerCase().includes(skill.toLowerCase()));

    const matchesRating = filters.rating === 0 || worker.rating >= filters.rating;

    return matchesSearch && matchesSkills && matchesRating;
  });

  const sortedWorkers = [...filteredWorkers].sort((a, b) => b.rating - a.rating);
  const totalPages = Math.ceil(sortedWorkers.length / workersPerPage);
  const paginatedWorkers = sortedWorkers.slice((currentPage - 1) * workersPerPage, currentPage * workersPerPage);

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
                    className={`p-2.5 rounded-lg transition-colors ${
                      viewMode === "grid"
                        ? "bg-blue-600 text-white"
                        : "bg-muted text-foreground/70 hover:bg-blue-50 hover:text-blue-600"
                    }`}
                  >
                    <LayoutGrid className="w-4.5 h-4.5" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2.5 rounded-lg transition-colors ${
                      viewMode === "list"
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