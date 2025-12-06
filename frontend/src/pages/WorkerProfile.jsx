import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Plus, X, Check, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Toaster, toast } from "sonner";

// SkillLink-styled Header
const Header = ({ variant }) => (
  <header className="bg-background border-b border-border py-4 px-6">
    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
      {variant === "worker" ? "Worker Dashboard" : "Client Dashboard"}
    </h1>
  </header>
);

export default function WorkerProfilePage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    skills: [],
    experience: "",
    bio: "",
    location: "",
    hourlyRate: "",
  });

  const [documents, setDocuments] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [newSkill, setNewSkill] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill)) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }));
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skill) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
  };

  const handleFileUpload = (e, type) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      files.forEach((file) => {
        if (type === "documents") {
          setDocuments((prev) => [...prev, { file, name: file.name }]);
        } else {
          setCertificates((prev) => [...prev, { file, name: file.name }]);
        }
      });
      toast.success(`${files.length} file(s) uploaded successfully`);
    }
  };

  const handleRemoveFile = (index, type) => {
    if (type === "documents") {
      setDocuments((prev) => prev.filter((_, i) => i !== index));
    } else {
      setCertificates((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fullName || !formData.email || !formData.phone || formData.skills.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      toast.success("Profile submitted successfully for verification");

      setTimeout(() => {
        navigate("/jobs");
      }, 2500);
    }, 1500);
  };

  return (
    <>
      <Toaster position="top-right" />
      <Header variant="worker" />
      <main className="min-h-screen bg-background">
        {/* Hero */}
        <section className="bg-gradient-to-br from-blue-600/5 to-green-500/5 py-12 sm:py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Create Your Worker Profile
              </h1>
              <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
                Build your professional profile and get verified. Upload your documents and certificates so clients can
                trust your expertise.
              </p>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            {submitted ? (
              <div className="text-center py-12">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-green-500/10 rounded-full">
                    <Check className="w-12 h-12 text-green-500" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Profile Submitted!</h2>
                <p className="text-foreground/70 mb-6">
                  Your profile has been submitted for verification. Our team will review your documents within 24–48 hours.
                </p>
                <Button asChild>
                  <Link to="/jobs">Browse Jobs</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Personal Info */}
                <Card className="p-6 sm:p-8 border border-border bg-card">
                  <h2 className="text-2xl font-bold text-foreground mb-6">Personal Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        placeholder="Enter your full name"
                        className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="your.email@example.com"
                        className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+1 (555) 000-0000"
                        className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Location</label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        placeholder="City, State"
                        className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Hourly Rate ($)</label>
                      <input
                        type="number"
                        name="hourlyRate"
                        value={formData.hourlyRate}
                        onChange={handleInputChange}
                        placeholder="e.g., 50"
                        className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Years of Experience</label>
                      <select
                        name="experience"
                        value={formData.experience}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select experience level</option>
                        <option value="0-1">0–1 years</option>
                        <option value="1-3">1–3 years</option>
                        <option value="3-5">3–5 years</option>
                        <option value="5-10">5–10 years</option>
                        <option value="10+">10+ years</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-6">
                    <label className="block text-sm font-semibold text-foreground mb-2">Bio</label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      placeholder="Tell clients about yourself..."
                      rows={4}
                      className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </Card>

                {/* Skills */}
                <Card className="p-6 sm:p-8 border border-border bg-card">
                  <h2 className="text-2xl font-bold text-foreground mb-6">Your Skills</h2>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill())}
                        placeholder="e.g., Carpentry, Plumbing"
                        className="flex-1 px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <Button type="button" onClick={handleAddSkill} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Skill
                      </Button>
                    </div>
                    {formData.skills.length === 0 ? (
                      <p className="text-foreground/60 text-sm">No skills added yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {formData.skills.map((skill) => (
                          <div
                            key={skill}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(skill)}
                              className="hover:text-blue-900"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>

                {/* Documents */}
                <Card className="p-6 sm:p-8 border border-border bg-card">
                  <h2 className="text-2xl font-bold text-foreground mb-6">Documents & Proof</h2>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-4">
                      Upload Documents (ID, Address Proof, etc.)
                    </label>
                    <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-blue-50 transition-colors">
                      <input
                        type="file"
                        multiple
                        onChange={(e) => handleFileUpload(e, "documents")}
                        className="hidden"
                        id="documents-upload"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                      <label htmlFor="documents-upload" className="cursor-pointer flex flex-col items-center gap-3">
                        <Upload className="w-8 h-8 text-blue-600" />
                        <span className="text-sm font-semibold text-foreground">Click to upload</span>
                        <span className="text-xs text-foreground/60">PDF, JPG, PNG (Max 10MB)</span>
                      </label>
                    </div>
                    {documents.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm font-semibold text-foreground">Uploaded Documents:</p>
                        {documents.map((doc, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-background border border-border rounded-lg"
                          >
                            <span className="text-sm text-foreground truncate">{doc.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(index, "documents")}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>

                {/* Certificates */}
                <Card className="p-6 sm:p-8 border border-border bg-card">
                  <h2 className="text-2xl font-bold text-foreground mb-6">Certificates & Credentials</h2>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-4">
                      Upload Certificates (Licenses, Training, etc.)
                    </label>
                    <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-green-50 transition-colors">
                      <input
                        type="file"
                        multiple
                        onChange={(e) => handleFileUpload(e, "certificates")}
                        className="hidden"
                        id="certificates-upload"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                      <label htmlFor="certificates-upload" className="cursor-pointer flex flex-col items-center gap-3">
                        <Upload className="w-8 h-8 text-green-600" />
                        <span className="text-sm font-semibold text-foreground">Click to upload</span>
                        <span className="text-xs text-foreground/60">PDF, JPG, PNG (Max 10MB)</span>
                      </label>
                    </div>
                    {certificates.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm font-semibold text-foreground">Uploaded Certificates:</p>
                        {certificates.map((cert, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-background border border-border rounded-lg"
                          >
                            <span className="text-sm text-foreground truncate">{cert.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(index, "certificates")}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>

                {/* Verification Info */}
                <Card className="p-6 sm:p-8 bg-blue-50 border border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">Admin Verification</h3>
                  <p className="text-blue-700 text-sm mb-4">
                    Our team will review your documents within 24–48 hours. You'll receive an email once verified.
                  </p>
                  <ul className="space-y-2 text-sm text-blue-700">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      Documents must be clear and legible
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      Certificates must be valid and up-to-date
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      Contact info must be accurate
                    </li>
                  </ul>
                </Card>

                {/* Submit */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={loading || formData.skills.length === 0}
                    className="flex-1 gap-2 bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-700 hover:to-green-600 text-white"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {loading ? "Submitting..." : "Submit Profile for Verification"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    asChild
                    className="border-border text-foreground hover:bg-blue-50"
                  >
                    <Link to="/jobs">Skip for Now</Link>
                  </Button>
                </div>
              </form>
            )}
          </div>
        </section>


        {/* Footer (optional: you can move to shared component) */}
        <footer className="bg-card border-t border-border py-8 sm:py-12 mt-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-foreground/60">
              © {new Date().getFullYear()} SkillLink. All rights reserved.
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}