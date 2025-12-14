// JobsPage.jsx
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LayoutGrid, List, MapPin, Clock, DollarSign, Plus } from "lucide-react";
import { Toaster, toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import api from "../api/api";

function JobRequestForm({ onClose, onJobCreated }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    address: "",
    city: "",
    budget: "",
    estimatedDuration: "",
    durationUnit: "hours",
    urgency: "medium",
    preferredDate: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.category || !formData.address || !formData.budget) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.title.length > 100) {
      toast.error("Title must be 100 characters or less");
      return;
    }

    if (formData.description.length > 2000) {
      toast.error("Description must be 2000 characters or less");
      return;
    }

    const budgetNum = parseFloat(formData.budget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      toast.error("Budget must be a valid positive number");
      return;
    }

    const payload = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      address: formData.address,
      city: formData.city || undefined,
      budget: budgetNum,
      estimatedDuration: formData.estimatedDuration ? Number(formData.estimatedDuration) : undefined,
      durationUnit: formData.durationUnit,
      urgency: formData.urgency,
      preferredDate: formData.preferredDate || undefined,
    };

    try {
      setIsSubmitting(true);
      const response = await api.post("/jobs/add", payload);
      toast.success("Job request submitted successfully!");
      if (onJobCreated) onJobCreated(response.data);
      onClose();
    } catch (error) {
      console.error("Job submission error:", error);
      const message = error.response?.data?.message || "Failed to submit job. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-semibold text-foreground">
          Job Title <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          placeholder="e.g., Kitchen Cabinet Installation"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          maxLength={100}
          required
          className="h-11"
        />
        <p className="text-xs text-foreground/60">{formData.title.length}/100 characters</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-semibold text-foreground">
          Description <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="description"
          placeholder="Describe the job in detail..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          maxLength={2000}
          required
          rows={5}
          className="resize-none"
        />
        <p className="text-xs text-foreground/60">{formData.description.length}/2000 characters</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category" className="text-sm font-semibold text-foreground">
          Category <span className="text-red-500">*</span>
        </Label>
        <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Carpentry">Carpentry</SelectItem>
            <SelectItem value="Plumbing">Plumbing</SelectItem>
            <SelectItem value="Electrical">Electrical</SelectItem>
            <SelectItem value="Painting">Painting</SelectItem>
            <SelectItem value="HVAC">HVAC</SelectItem>
            <SelectItem value="Welding">Welding</SelectItem>
            <SelectItem value="Cooking">Cooking</SelectItem>
            <SelectItem value="Mechanic">Mechanic</SelectItem>
            <SelectItem value="House Help">House Help</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="address" className="text-sm font-semibold text-foreground">
            Address <span className="text-red-500">*</span>
          </Label>
          <Input
            id="address"
            placeholder="Street address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            required
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city" className="text-sm font-semibold text-foreground">
            City
          </Label>
          <Input
            id="city"
            placeholder="City name"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="budget" className="text-sm font-semibold text-foreground">
          Budget (USD) <span className="text-red-500">*</span>
        </Label>
        <Input
          id="budget"
          type="number"
          placeholder="Enter amount"
          value={formData.budget}
          onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
          min="0"
          step="0.01"
          required
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold text-foreground">Estimated Duration</Label>
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            placeholder="Duration"
            value={formData.estimatedDuration}
            onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
            min="0"
            className="h-11"
          />
          <Select
            value={formData.durationUnit}
            onValueChange={(value) => setFormData({ ...formData, durationUnit: value })}
          >
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hours">Hours</SelectItem>
              <SelectItem value="days">Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="urgency" className="text-sm font-semibold text-foreground">
          Urgency
        </Label>
        <Select value={formData.urgency} onValueChange={(value) => setFormData({ ...formData, urgency: value })}>
          <SelectTrigger className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="preferredDate" className="text-sm font-semibold text-foreground">
          Preferred Start Date
        </Label>
        <Input
          id="preferredDate"
          type="date"
          value={formData.preferredDate}
          onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
          className="h-11"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="flex-1 h-11 border-border text-foreground hover:bg-muted bg-transparent"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 text-white"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit Job Request"}
        </Button>
      </div>
    </form>
  );
}

// ✅ FIXED: Properly render location object
function JobCard({ id, title, description, skills, budget, location, postedDate, jobType }) {
  // Handle location object safely
  const locationText = typeof location === 'string' 
    ? location 
    : (location?.address || "Unknown");

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
        {skills?.slice(0, 2).map((skill) => (
          <span key={skill} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
            {skill}
          </span>
        ))}
        {skills?.length > 2 && <span className="px-2.5 py-1 text-xs text-foreground/60">+{skills.length - 2} more</span>}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 text-sm text-foreground/60 mb-5">
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-green-600" />
          <span className="font-semibold text-foreground">{budget}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span>{locationText}</span> {/* ✅ FIXED */}
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
    });
  };

  const handleLocationChange = (e) => {
    const value = e.target.value;
    setSelectedLocation(value);
    onFiltersChange({
      skills: selectedSkills,
      location: value,
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
        className="w-full border-border text-foreground hover:bg-blue-50 hover:text-blue-700 bg-transparent"
        size="sm"
        onClick={() => {
          setSelectedSkills([]);
          setSelectedLocation("");
          onFiltersChange({ skills: [], location: "" });
        }}
      >
        Reset Filters
      </Button>
    </div>
  );
}

export default function JobsPage() {
  const [viewMode, setViewMode] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    skills: [],
    location: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalJobs, setTotalJobs] = useState(0);
  const jobsPerPage = 20;

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append("search", searchTerm.trim());
      if (filters.location?.trim()) params.append("location", filters.location.trim());
      if (filters.skills?.length) params.append("skills", filters.skills.join(","));
      params.append("page", currentPage);
      params.append("limit", jobsPerPage);

      const response = await api.get(`/jobs?${params.toString()}`);
      const jobs = response.data.jobs || response.data;
      const total = response.data.total || (Array.isArray(jobs) ? jobs.length : 0);

      setJobs(Array.isArray(jobs) ? jobs : []);
      setTotalJobs(total);
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
      toast.error("Failed to load jobs.");
      setJobs([]);
      setTotalJobs(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [searchTerm, filters, currentPage]);

  // Auto-log user from localStorage (dev only)
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        console.log("🎯 Current user from localStorage:", user);
      } catch (e) {
        console.warn("⚠️ Invalid user data in localStorage");
      }
    } else {
      console.log("🚫 No user found in localStorage — not logged in");
    }
  }, []);

  const handleJobCreated = () => {
    setCurrentPage(1);
    fetchJobs();
  };

  const totalPages = Math.ceil(totalJobs / jobsPerPage);

  return (
    <>
      <Toaster />
      <header className="bg-background border-b border-border py-4 px-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
          Find Work
        </h1>
      </header>

      <main className="min-h-screen bg-background">
        <div className="bg-card border-b border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Find Skilled Jobs Near You</h1>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 text-white h-11 px-6 whitespace-nowrap">
                    <Plus className="w-4 h-4 mr-2" />
                    Request Job
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
                      Request a Job
                    </DialogTitle>
                    <DialogDescription className="text-foreground/70">
                      Fill in the details below to post your job request. Fields marked with * are required.
                    </DialogDescription>
                  </DialogHeader>
                  <JobRequestForm onClose={() => setIsDialogOpen(false)} onJobCreated={handleJobCreated} />
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-foreground/70 mb-6 max-w-2xl">
              Browse thousands of job opportunities from clients looking for skilled professionals
            </p>

            <div className="flex gap-3 max-w-2xl">
              <Input
                type="text"
                placeholder="Search job title, keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 h-12 text-base"
              />
              <Button className="h-12 px-6 bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 text-white">
                Search
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row gap-8">
            <aside className="hidden md:block">
              <FilterSidebar onFiltersChange={setFilters} />
            </aside>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <div className="text-sm text-foreground/70">
                  Showing <span className="font-semibold text-foreground">{jobs.length}</span> of{" "}
                  <span className="font-semibold text-foreground">{totalJobs}</span> jobs
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

              {loading ? (
                <div className="text-center py-16">
                  <p className="text-foreground/70">Loading jobs...</p>
                </div>
              ) : jobs.length > 0 ? (
                // ✅ FIXED: Added key={job.id}
                <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "flex flex-col gap-6"}>
                  {jobs.map((job) => (
                    <JobCard
                      key={job.id} // ✅ REQUIRED
                      id={job.id}
                      title={job.title}
                      description={job.description}
                      skills={job.skills || []}
                      budget={job.budget ? `$${job.budget}` : "N/A"}
                      location={job.location} // Now safe to pass object
                      postedDate={job.postedDate || new Date(job.createdAt).toLocaleString()}
                      jobType={job.jobType || "Contract"}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-foreground/70 mb-4">No jobs found matching your criteria</p>
                  <Button
                    variant="outline"
                    className="border-border text-foreground hover:bg-blue-50 hover:text-blue-700 bg-transparent"
                    onClick={() => {
                      setSearchTerm("");
                      setFilters({ skills: [], location: "" });
                      setCurrentPage(1);
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}

              {!loading && totalJobs > jobsPerPage && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <Button
                    variant="outline"
                    className="border-border text-foreground hover:bg-blue-50 bg-transparent"
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
                    className="border-border text-foreground hover:bg-blue-50 bg-transparent"
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