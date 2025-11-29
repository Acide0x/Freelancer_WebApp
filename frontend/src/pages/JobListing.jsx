import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LayoutGrid, List, MapPin, Clock, DollarSign } from "lucide-react";
import { Toaster } from "sonner";

// Mock data (unchanged)
const mockJobs = [
  {
    id: "1",
    title: "Kitchen Renovation - Cabinet Installation",
    description: "Need experienced carpenter for kitchen cabinet installation and finishing",
    skills: ["Carpentry", "Cabinet Making", "Finishing"],
    budget: "$800 - $1200",
    location: "New York, NY",
    postedDate: "2 hours ago",
    jobType: "Contract",
  },
  {
    id: "2",
    title: "Emergency Plumbing Repair",
    description: "Burst pipe in bathroom. Need immediate plumber to assess and fix",
    skills: ["Plumbing", "Pipe Repair", "Water Systems"],
    budget: "$200 - $400",
    location: "Brooklyn, NY",
    postedDate: "30 minutes ago",
    jobType: "Contract",
  },
  {
    id: "3",
    title: "Full House Electrical Wiring",
    description: "New construction project requiring full electrical wiring installation",
    skills: ["Electrical", "Wiring", "Code Compliance"],
    budget: "$3000 - $5000",
    location: "Queens, NY",
    postedDate: "1 day ago",
    jobType: "Full-time",
  },
  {
    id: "4",
    title: "Interior Painting Project",
    description: "Paint interior walls of 3-bedroom apartment. High-quality finish required",
    skills: ["Painting", "Drywall Prep", "Interior Design"],
    budget: "$500 - $800",
    location: "Manhattan, NY",
    postedDate: "3 hours ago",
    jobType: "Contract",
  },
  {
    id: "5",
    title: "AC Unit Installation",
    description: "Install new AC unit in office space. Must have certification",
    skills: ["AC Installation", "HVAC", "Refrigeration"],
    budget: "$1500 - $2500",
    location: "New York, NY",
    postedDate: "12 hours ago",
    jobType: "Contract",
  },
  {
    id: "6",
    title: "Auto Repair - Engine Diagnostics",
    description: "Vehicle making unusual noises. Need diagnostic and repair estimate",
    skills: ["Engine Repair", "Diagnostics", "Maintenance"],
    budget: "$150 - $300",
    location: "Bronx, NY",
    postedDate: "2 days ago",
    jobType: "Part-time",
  },
  {
    id: "7",
    title: "Private Chef - Weekly Meal Prep",
    description: "Looking for chef to prepare meals 3 days/week for family of 4",
    skills: ["Cooking", "Menu Planning", "Food Safety"],
    budget: "$400/week",
    location: "Remote",
    postedDate: "4 hours ago",
    jobType: "Part-time",
  },
  {
    id: "8",
    title: "Deck Building - Summer Project",
    description: "Build 20x15 deck with stairs and railing. Design provided",
    skills: ["Carpentry", "Construction", "Outdoor Building"],
    budget: "$2000 - $3500",
    location: "New York, NY",
    postedDate: "6 hours ago",
    jobType: "Contract",
  },
  {
    id: "9",
    title: "Corporate Event Catering",
    description: "Catering for 150 people corporate event. Menu customization available",
    skills: ["Catering", "Food Prep", "Event Management"],
    budget: "$1200 - $1800",
    location: "Manhattan, NY",
    postedDate: "1 day ago",
    jobType: "Contract",
  },
  {
    id: "10",
    title: "Welding - Metal Gate Repair",
    description: "Custom metal gate needs welding repair and reinforcement",
    skills: ["Welding", "Metal Fabrication", "Safety"],
    budget: "$300 - $500",
    location: "Staten Island, NY",
    postedDate: "3 days ago",
    jobType: "Contract",
  },
];

// Header styled like Navbar (minimal, clean)
const Header = ({ variant }) => (
  <header className="bg-background border-b border-border py-4 px-6">
    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
      {variant === "worker" ? "Find Work" : "Hire Professionals"}
    </h1>
  </header>
);

// JobCard with SkillLink styling
function JobCard({ id, title, description, skills, budget, location, postedDate, jobType }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:border-blue-500 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-bold text-foreground text-lg mb-2">{title}</h3>
          <p className="text-sm text-foreground/70 line-clamp-2">{description}</p>
        </div>
        <span className="ml-2 px-3 py-1 bg-blue-600/10 text-blue-600 text-xs font-medium rounded-full whitespace-nowrap">
          {jobType}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {skills.slice(0, 2).map((skill) => (
          <span key={skill} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
            {skill}
          </span>
        ))}
        {skills.length > 2 && (
          <span className="px-2.5 py-1 text-xs text-foreground/60">+{skills.length - 2} more</span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 text-sm text-foreground/60 mb-5">
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-green-600" />
          <span className="font-semibold text-foreground">{budget}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span>{location}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-cyan-600" />
          <span>{postedDate}</span>
        </div>
      </div>

      <Button className="w-full bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 text-white">
        View Details
      </Button>
    </div>
  );
}

// FilterSidebar styled consistently
function FilterSidebar({ onFiltersChange }) {
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("");

  const handleSkillChange = (skill) => {
    const updated = selectedSkills.includes(skill)
      ? selectedSkills.filter((s) => s !== skill)
      : [...selectedSkills, skill];
    setSelectedSkills(updated);
    onFiltersChange({
      skills: updated,
      location: selectedLocation,
      priceRange: [0, 5000],
      rating: 0,
    });
  };

  const handleLocationChange = (e) => {
    setSelectedLocation(e.target.value);
    onFiltersChange({
      skills: selectedSkills,
      location: e.target.value,
      priceRange: [0, 5000],
      rating: 0,
    });
  };

  const skills = ["Carpentry", "Plumbing", "Electrical", "Painting", "HVAC", "Welding", "Cooking", "Auto Repair"];

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
        <h4 className="font-semibold text-foreground text-sm mb-3">Location</h4>
        <Input
          type="text"
          placeholder="City or region..."
          value={selectedLocation}
          onChange={handleLocationChange}
          className="text-sm h-10"
        />
      </div>

      <Button
        variant="outline"
        className="w-full border-border text-foreground hover:bg-blue-50 hover:text-blue-700"
        size="sm"
        onClick={() => {
          setSelectedSkills([]);
          setSelectedLocation("");
          onFiltersChange({ skills: [], location: "", priceRange: [0, 5000], rating: 0 });
        }}
      >
        Reset Filters
      </Button>
    </div>
  );
}

// Main JobsPage
export default function JobsPage() {
  const [viewMode, setViewMode] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    skills: [],
    location: "",
    priceRange: [0, 5000],
    rating: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 20;

  const filteredJobs = mockJobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSkills =
      filters.skills.length === 0 ||
      filters.skills.some((skill) =>
        job.skills.some((jobSkill) => jobSkill.toLowerCase().includes(skill.toLowerCase()))
      );

    const matchesLocation = !filters.location || job.location.toLowerCase().includes(filters.location.toLowerCase());

    return matchesSearch && matchesSkills && matchesLocation;
  });

  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);
  const paginatedJobs = filteredJobs.slice((currentPage - 1) * jobsPerPage, currentPage * jobsPerPage);

  return (
    <>
      <Toaster />
      <Header variant="worker" />
      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <div className="bg-card border-b border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Find Skilled Jobs Near You
            </h1>
            <p className="text-foreground/70 mb-6 max-w-2xl">
              Browse thousands of job opportunities from clients looking for skilled professionals
            </p>

            <div className="flex gap-3 max-w-2xl">
              <Input
                type="text"
                placeholder="Search job title, keywords..."
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
              <FilterSidebar onFiltersChange={setFilters} />
            </aside>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <div className="text-sm text-foreground/70">
                  Showing <span className="font-semibold text-foreground">{paginatedJobs.length}</span> of{" "}
                  <span className="font-semibold text-foreground">{filteredJobs.length}</span> jobs
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

              {paginatedJobs.length > 0 ? (
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 md:grid-cols-2 gap-6"
                      : "flex flex-col gap-6"
                  }
                >
                  {paginatedJobs.map((job) => (
                    <JobCard key={job.id} {...job} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-foreground/70 mb-4">No jobs found matching your criteria</p>
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

              {filteredJobs.length > 0 && (
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