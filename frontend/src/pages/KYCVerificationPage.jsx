// src/pages/admin/KYCVerification.jsx
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Grid3x3,
  List,
  Check,
  X,
  Edit2,
  Eye,
  Lock,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/api/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStatusColor = (status) => {
  switch (status) {
    case "approved":
      return "bg-emerald-500/20 text-emerald-600 border-emerald-500/30";
    case "rejected":
      return "bg-red-500/20 text-red-600 border-red-500/30";
    default:
      return "bg-amber-500/20 text-amber-600 border-amber-500/30";
  }
};

const formatStatus = (status) =>
  status.charAt(0).toUpperCase() + status.slice(1);

// ─── API calls ────────────────────────────────────────────────────────────────

// GET /api/admin/users/providers/pending
const fetchProviderRequests = async () => {
  try {
    const response = await api.get("/admins/providers/pending");
    return response.data.data || [];
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to load provider applications";
    toast.error(message);
    throw error;
  }
};

// PATCH /api/admin/users/:userId/verify  { action: "approve" }
const approveProvider = async (id) => {
  try {
    const response = await api.patch(`/admins/providers/${id}/verify`, {
      action: "approve",
    });
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.message || error.message || "Approval failed";
    toast.error(message);
    throw error;
  }
};

// PATCH /api/admin/users/:userId/verify  { action: "reject", rejectionReason? }
const rejectProvider = async (id, rejectionReason = "") => {
  try {
    const response = await api.patch(`/admins/providers/${id}/verify`, {
      action: "reject",
      ...(rejectionReason && { rejectionReason }),
    });
    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.message || error.message || "Rejection failed";
    toast.error(message);
    throw error;
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function KYCVerification() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("list");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await fetchProviderRequests();
      setRequests(data);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const getVerificationStatus = (req) =>
    req.providerDetails?.verificationStatus || "pending";

  const filteredRequests = requests.filter((req) => {
    const name = req.businessName || req.name || "";
    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (req.providerDetails?.headline
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ?? false);
    const matchesStatus =
      statusFilter === "all" || getVerificationStatus(req) === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => getVerificationStatus(r) === "pending").length,
    approved: requests.filter((r) => getVerificationStatus(r) === "approved").length,
    rejected: requests.filter((r) => getVerificationStatus(r) === "rejected").length,
  };

  // Optimistically update local state after approve/reject
  const patchLocalStatus = (id, status, isVerified) => {
    setRequests((prev) =>
      prev.map((req) =>
        req._id === id
          ? {
              ...req,
              providerDetails: {
                ...req.providerDetails,
                verificationStatus: status,
                isVerified,
              },
            }
          : req
      )
    );
  };

  const handleApprove = async (id) => {
    setProcessingId(id);
    try {
      await approveProvider(id);
      toast.success("Provider approved successfully!");
      patchLocalStatus(id, "approved", true);
      setSelectedRequest(null);
    } catch {
      // toast shown inside approveProvider
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    setProcessingId(id);
    try {
      await rejectProvider(id, rejectReason);
      toast.success("Provider rejected.");
      patchLocalStatus(id, "rejected", false);
      setSelectedRequest(null);
      setRejectReason("");
      setShowRejectInput(false);
    } catch {
      // toast shown inside rejectProvider
    } finally {
      setProcessingId(null);
    }
  };

  const handleModalClose = () => {
    setSelectedRequest(null);
    setRejectReason("");
    setShowRejectInput(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          KYC Verification
        </h1>
        <p className="text-gray-600">
          Review and manage onboarding applications from service providers
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Total Requests",
            value: stats.total,
            color: "from-green-600 to-green-700",
          },
          {
            label: "Pending",
            value: stats.pending,
            color: "from-amber-500 to-amber-600",
          },
          {
            label: "Approved",
            value: stats.approved,
            color: "from-emerald-500 to-emerald-600",
          },
          {
            label: "Rejected",
            value: stats.rejected,
            color: "from-red-500 to-red-600",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`bg-gradient-to-br ${stat.color} rounded-lg p-6 shadow-sm`}
          >
            <p className="text-white/90 text-sm font-medium">{stat.label}</p>
            <p className="text-4xl font-bold text-white mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-3 text-gray-500"
            size={20}
          />
          <input
            type="text"
            placeholder="Search by name, email, or headline..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg pl-10 pr-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none transition"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none transition"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <div className="flex gap-2 bg-white border border-gray-300 rounded-lg p-1">
          <button
            onClick={() => setViewMode("list")}
            className={`p-2.5 rounded transition ${
              viewMode === "list"
                ? "bg-green-600 text-white"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <List size={20} />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2.5 rounded transition ${
              viewMode === "grid"
                ? "bg-green-600 text-white"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <Grid3x3 size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No requests found</p>
        </div>
      ) : viewMode === "list" ? (
        <div className="space-y-3">
          {filteredRequests.map((request) => {
            const currentStatus = getVerificationStatus(request);
            return (
              <div
                key={request._id}
                onClick={() => setSelectedRequest(request)}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-green-500 hover:shadow-md transition cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {request.businessName || request.name}
                    </h3>
                    <p className="text-sm text-gray-600">{request.email}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      currentStatus
                    )}`}
                  >
                    {formatStatus(currentStatus)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-3">
                  {request.providerDetails?.headline ?? "No headline"}
                </p>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <p>
                      💼{" "}
                      {request.providerDetails?.experienceYears ?? 0}+ years
                      experience
                    </p>
                    <p>
                      📍{" "}
                      {request.providerDetails?.serviceAreas?.[0]?.address ??
                        "Location not set"}
                    </p>
                  </div>
                  <button className="text-green-600 hover:text-green-700 flex items-center gap-1 text-sm transition">
                    <Eye size={16} /> View
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRequests.map((request) => {
            const currentStatus = getVerificationStatus(request);
            const image =
              request.providerDetails?.portfolios?.[0]?.images?.[0] ||
              "/customer-service-interaction.png";
            return (
              <div
                key={request._id}
                onClick={() => setSelectedRequest(request)}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-green-500 hover:shadow-md transition cursor-pointer"
              >
                <div className="relative h-40 overflow-hidden bg-gray-100">
                  <img
                    src={image}
                    alt={request.businessName || request.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                  <div className="absolute top-3 right-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        currentStatus
                      )}`}
                    >
                      {formatStatus(currentStatus)}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {request.businessName || request.name}
                  </h3>
                  <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                    {request.providerDetails?.headline ?? "No headline"}
                  </p>
                  <div className="space-y-1 text-xs text-gray-600 mb-4">
                    <p>
                      ⭐ {request.providerDetails?.experienceYears ?? 0}+ years
                    </p>
                    <p>💰 ${request.providerDetails?.rate ?? 0}/hour</p>
                  </div>
                  <button className="w-full bg-green-600 hover:bg-green-700 text-white rounded py-2 text-sm font-medium transition flex items-center justify-center gap-2">
                    <Eye size={16} /> View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {selectedRequest.businessName || selectedRequest.name}
                  </h2>
                  <p className="text-green-100 text-sm mt-1">
                    {selectedRequest.email}
                  </p>
                  <span
                    className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      getVerificationStatus(selectedRequest)
                    )}`}
                  >
                    {formatStatus(getVerificationStatus(selectedRequest))}
                  </span>
                </div>
                <button
                  onClick={handleModalClose}
                  className="text-green-100 hover:text-white transition"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Headline */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Edit2 size={16} className="text-green-600" />
                  Professional Headline
                </label>
                <textarea
                  value={
                    selectedRequest.providerDetails?.headline ?? ""
                  }
                  readOnly
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-900 text-sm focus:outline-none"
                  rows={2}
                />
              </div>

              {/* Work Description */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Edit2 size={16} className="text-green-600" />
                  Work Description
                </label>
                <textarea
                  value={
                    selectedRequest.providerDetails?.workDescription ?? ""
                  }
                  readOnly
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-900 text-sm focus:outline-none"
                  rows={4}
                />
              </div>

              {/* Skills */}
              {(selectedRequest.providerDetails?.skills || []).length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-3 block">
                    Skills
                  </label>
                  <div className="space-y-2">
                    {selectedRequest.providerDetails.skills.map(
                      (skill, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-50 border border-gray-300 rounded-lg p-3"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <p className="font-medium text-gray-900">
                              {skill.name}
                            </p>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              {skill.years}{" "}
                              {skill.years === 1 ? "year" : "years"}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded h-1.5">
                            <div
                              className="bg-green-600 h-1.5 rounded"
                              style={{
                                width: `${(skill.proficiency / 10) * 100}%`,
                              }}
                            />
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            Proficiency: {skill.proficiency}/10
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Service Areas */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <Lock size={16} className="text-red-500" />
                  Service Areas (Read-only)
                </label>
                <div className="space-y-2">
                  {(selectedRequest.providerDetails?.serviceAreas || []).map(
                    (area, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-50 border border-red-200 rounded-lg p-3"
                      >
                        <p className="text-gray-900 font-medium">
                          {area.address}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Service Radius: {area.radiusKm} km
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Pricing */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <Lock size={16} className="text-red-500" />
                  Pricing (Read-only)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "Hourly Rate",
                      value: `$${selectedRequest.providerDetails?.rate ?? 0}/hour`,
                    },
                    {
                      label: "Min. Service Fee",
                      value: `$${selectedRequest.providerDetails?.minCallOutFee ?? 0}`,
                    },
                    {
                      label: "Travel Fee/km",
                      value: `$${selectedRequest.providerDetails?.travelFeePerKm ?? 0}`,
                    },
                    {
                      label: "Free Travel Distance",
                      value: `${selectedRequest.providerDetails?.travelThresholdKm ?? 0} km`,
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="bg-gray-50 border border-red-200 rounded-lg p-3"
                    >
                      <p className="text-xs text-gray-600">{item.label}</p>
                      <p className="text-gray-900 font-semibold mt-1">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Portfolio */}
              {(selectedRequest.providerDetails?.portfolios || []).length >
                0 && (
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <Lock size={16} className="text-red-500" />
                    Portfolio (
                    {selectedRequest.providerDetails.portfolios.length}{" "}
                    projects)
                  </label>
                  <div className="space-y-4">
                    {selectedRequest.providerDetails.portfolios.map(
                      (portfolio, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-50 border border-red-200 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-gray-900">
                              {portfolio.title || `Project ${idx + 1}`}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {portfolio.images?.length || 0} image(s)
                            </Badge>
                          </div>
                          {portfolio.description && (
                            <p className="text-sm text-gray-700 mb-3">
                              {portfolio.description}
                            </p>
                          )}
                          {portfolio.images?.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {portfolio.images.map((img, imgIdx) => (
                                <img
                                  key={imgIdx}
                                  src={img}
                                  alt={`Portfolio ${idx + 1} - ${imgIdx + 1}`}
                                  className="w-20 h-20 object-cover rounded border border-gray-300 hover:opacity-75 transition-opacity"
                                  onError={(e) =>
                                    (e.target.style.display = "none")
                                  }
                                />
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs italic text-gray-500">
                              No images uploaded
                            </p>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Availability */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Availability Status
                </label>
                <div className="inline-block bg-gray-100 border border-gray-300 rounded-lg px-3 py-1">
                  <span
                    className={`text-sm font-medium capitalize ${
                      selectedRequest.providerDetails?.availabilityStatus ===
                      "available"
                        ? "text-emerald-600"
                        : selectedRequest.providerDetails
                              ?.availabilityStatus === "busy"
                          ? "text-amber-600"
                          : "text-gray-500"
                    }`}
                  >
                    {selectedRequest.providerDetails?.availabilityStatus ??
                      "unknown"}
                  </span>
                </div>
              </div>

              {/* Rejection reason input — shown when reject button clicked */}
              {showRejectInput && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Rejection Reason{" "}
                    <span className="text-gray-400 font-normal">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Explain why this provider is being rejected..."
                    className="w-full bg-gray-50 border border-red-300 rounded-lg p-3 text-gray-900 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none"
                    rows={3}
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 bg-gray-50 p-4 flex gap-3">
              {/* Two-step reject: first click shows reason input, second confirms */}
              {!showRejectInput ? (
                <button
                  onClick={() => setShowRejectInput(true)}
                  disabled={processingId === selectedRequest._id}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 transition font-medium disabled:opacity-70"
                >
                  <X size={18} /> Reject
                </button>
              ) : (
                <div className="flex-1 flex gap-2">
                  <button
                    onClick={() => {
                      setShowRejectInput(false);
                      setRejectReason("");
                    }}
                    className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm transition hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleReject(selectedRequest._id)}
                    disabled={processingId === selectedRequest._id}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 transition font-medium disabled:opacity-70"
                  >
                    {processingId === selectedRequest._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X size={18} />
                    )}{" "}
                    Confirm Reject
                  </button>
                </div>
              )}

              <button
                onClick={() => handleApprove(selectedRequest._id)}
                disabled={processingId === selectedRequest._id}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 transition font-medium disabled:opacity-70"
              >
                {processingId === selectedRequest._id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check size={18} />
                )}{" "}
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}