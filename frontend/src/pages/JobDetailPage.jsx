// src/pages/JobDetailPage.jsx
import { useState, useEffect, useCallback, useMemo } from 'react'; // 1. Added useMemo
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Star, MapPin, Clock, User, AlertCircle, CheckCircle,
  ArrowLeft, Loader2, MessageSquare, Calendar, Edit2, Trash2,
  XCircle, Briefcase, ShieldCheck, ExternalLink
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import api from '@/api/api';

// ============================================================================
// 🎨 HELPERS & UTILITIES
// ============================================================================
const formatUrgency = (urgency) => ({
  low: { label: 'Low Priority', class: 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200' },
  medium: { label: 'Medium Priority', class: 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200' },
  high: { label: 'High Priority', class: 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200' },
}[urgency] || { label: 'Medium Priority', class: 'bg-yellow-100 text-yellow-800 border-yellow-300' });

const formatStatus = (status) => ({
  open: { label: 'Open', class: 'bg-green-100 text-green-800 border-green-300' },
  assigned: { label: 'Assigned', class: 'bg-blue-100 text-blue-800 border-blue-300' },
  pending_provider_acceptance: { label: 'Awaiting Acceptance', class: 'bg-orange-100 text-orange-800 border-orange-300' },
  escrow_funded: { label: 'Escrow Funded', class: 'bg-purple-100 text-purple-800 border-purple-300' },
  in_progress: { label: 'In Progress', class: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  completed: { label: 'Completed', class: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  cancelled: { label: 'Cancelled', class: 'bg-gray-100 text-gray-600 border-gray-300 line-through' },
  disputed: { label: 'Disputed', class: 'bg-red-100 text-red-800 border-red-300' },
  resolved: { label: 'Resolved', class: 'bg-green-100 text-green-800 border-green-300' },
}[status] || { label: status, class: 'bg-gray-100 text-gray-700' });

const formatBudgetHint = (budget, category) => {
  const mult = { Carpentry: 0.8, Plumbing: 0.75, Electrical: 0.85, Painting: 0.9 }[category] || 0.8;
  return { min: Math.round(budget * mult), max: Math.round(budget * 1.2) };
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getCachedUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch { return null; }
};

// ============================================================================
// 👤 USER CARD COMPONENT (Reusable for Client & Provider)
// ============================================================================
function UserCard({ user, role, onMessage, onViewProfile, showRating = true }) {
  if (!user) return null;
  const isProvider = role === 'provider';
  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        <button
          onClick={() => onViewProfile?.(user._id)}
          className="relative group flex-shrink-0"
          aria-label={`View ${isProvider ? 'provider' : 'client'} profile`}
        >
          <img
            src={user.avatar?.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName?.[0] || 'U')}&background=${isProvider ? '22c55e' : '3b82f6'}&color=fff&size=56`}
            alt={user.fullName}
            className="w-14 h-14 rounded-full object-cover border-2 border-background ring-2 ring-gray-200 group-hover:ring-blue-400 transition-all"
            onError={(e) => {
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName?.[0] || 'U')}&background=${isProvider ? '22c55e' : '3b82f6'}&color=fff&size=56`;
            }}
          />
          {user.isVerified && (
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white" title="Verified">
              <ShieldCheck className="w-3 h-3 text-white" />
            </span>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onViewProfile?.(user._id)}
              className="font-semibold text-foreground hover:text-blue-600 transition-colors text-left truncate"
            >
              {user.fullName}
            </button>
            {isProvider && user.providerDetails?.headline && (
              <span className="text-xs text-gray-500 truncate max-w-[200px]">• {user.providerDetails.headline}</span>
            )}
          </div>
          {showRating && user.ratings?.count > 0 && (
            <div className="flex items-center gap-1 mt-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(user.ratings.average)
                      ? 'text-yellow-500 fill-yellow-500'
                      : i < user.ratings.average
                        ? 'text-yellow-300 fill-yellow-300'
                        : 'text-gray-300'
                  }`}
                />
              ))}
              <span className="text-sm text-gray-600 ml-1">
                {user.ratings.average?.toFixed(1)} ({user.ratings.count})
              </span>
            </div>
          )}
          {isProvider && user.providerDetails?.availabilityStatus && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-2 h-2 rounded-full ${
                user.providerDetails.availabilityStatus === 'available' ? 'bg-green-500' :
                  user.providerDetails.availabilityStatus === 'busy' ? 'bg-orange-500' : 'bg-gray-400'
              }`} />
              <span className="text-xs text-gray-500 capitalize">
                {user.providerDetails.availabilityStatus}
              </span>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </p>
        </div>
        {onMessage && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMessage(user)}
            className="flex-shrink-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            Message
          </Button>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// 📋 APPLICATION CARD COMPONENT (For Client View)
// ============================================================================
function ApplicationCard({ application, job, onAccept, onDecline, isOwner }) {
  const [loading, setLoading] = useState(false);
  const handleAction = async (action) => {
    if (!onAccept && !onDecline) return;
    setLoading(true);
    try {
      if (action === 'accept') {
        await api.patch(`/jobs/${job._id}/accept-application/${application._id}`);
        toast.success('Provider selected! Awaiting their confirmation.');
        onAccept?.(application);
      } else {
        toast.info('Application declined');
        onDecline?.(application);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };
  const worker = application.worker;
  return (
    <Card className="p-4 hover:border-blue-300 transition-colors">
      <div className="flex items-start gap-3">
        <img
          src={worker?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(worker?.fullName?.[0] || 'P')}&background=22c55e&color=fff&size=40`}
          alt={worker?.fullName}
          className="w-10 h-10 rounded-full object-cover"
          onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(worker?.fullName?.[0] || 'P')}&background=22c55e&color=fff&size=40`; }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="font-medium text-foreground">{worker?.fullName || 'Unknown Provider'}</p>
              {application.proposedPrice && (
                <p className="text-sm text-green-700 font-semibold">
                  Rs. {application.proposedPrice.toLocaleString()}
                </p>
              )}
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {formatDate(application.appliedAt)}
            </span>
          </div>
          {application.message && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{application.message}</p>
          )}
          {worker?.providerDetails?.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {worker.providerDetails.skills.slice(0, 3).map((skill, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                  {skill.name}
                </span>
              ))}
              {worker.providerDetails.skills.length > 3 && (
                <span className="text-xs text-gray-500">+{worker.providerDetails.skills.length - 3} more</span>
              )}
            </div>
          )}
        </div>
        {isOwner && job.status === 'open' && (
          <div className="flex flex-col gap-1.5">
            <Button
              size="sm"
              variant="default"
              onClick={() => handleAction('accept')}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 h-8"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3 mr-1" />}
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction('decline')}
              disabled={loading}
              className="text-xs px-3 h-8 border-gray-300"
            >
              <XCircle className="w-3 h-3 mr-1" />
              Decline
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// 🎯 MAIN PAGE COMPONENT
// ============================================================================
export default function JobDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // 2. FIX: Memoize currentUser to prevent infinite loops
  const currentUser = useMemo(() => getCachedUser(), []); 

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [proposedPrice, setProposedPrice] = useState('');
  const [coverMessage, setCoverMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [showApplications, setShowApplications] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // ⚡ Validate id and redirect if invalid
  useEffect(() => {
    if (!id || id === 'undefined' || id === 'null') {
      setRedirecting(true);
      const timer = setTimeout(() => {
        navigate('/jobs', { replace: true });
        toast.error('Invalid job link');
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [id, navigate]);

  // Fetch job data
  const fetchJob = useCallback(async () => {
    if (!id || id === 'undefined' || id === 'null' || redirecting) return;
    
    // 3. FIX: Add AbortController to handle unmounts gracefully
    const controller = new AbortController();
    
    try {
      const response = await api.get(`/jobs/${id}`, { signal: controller.signal });
      const data = response.data;
      const jobData = data?.job || data?.data?.job || data?.data || null;
      if (!jobData) throw new Error('Job not found');
      setJob(jobData);
      if (currentUser?.role === 'provider' && jobData.applications) {
        const applied = jobData.applications.some(
          app => app.worker?._id === currentUser._id || app.worker === currentUser._id
        );
        setHasApplied(applied);
      }
    } catch (err) {
      // 4. FIX: Ignore cancellation errors to stop console spam
      if (err.code === 'ERR_CANCELED') return;

      console.error('Fetch error:', err);
      const msg = err.response?.data?.message || 'Failed to load job';
      toast.error(msg);
      if (err.response?.status === 404) {
        setTimeout(() => navigate('/jobs', { replace: true }), 1200);
      }
    } finally {
      setLoading(false);
    }
    
    // Cleanup function for abort
    return () => controller.abort();
  }, [id, currentUser, navigate, redirecting]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  // Handle application submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!proposedPrice || !coverMessage.trim()) {
      return toast.error('Please fill in both price and message');
    }
    const price = parseFloat(proposedPrice);
    const hint = formatBudgetHint(job.budget, job.category);
    if (price < hint.min || price > hint.max) {
      return toast.error(`Price must be between Rs. ${hint.min.toLocaleString()} - Rs. ${hint.max.toLocaleString()}`);
    }
    setIsSubmitting(true);
    try {
      const response = await api.post(`/jobs/${id}/apply`, {
        proposedPrice: price,
        message: coverMessage.trim()
      });
      setHasApplied(true);
      toast.success(response.data?.message || 'Application submitted successfully!');
      setProposedPrice('');
      setCoverMessage('');
      await fetchJob();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle job cancellation (client only)
  const handleCancelJob = async () => {
    if (!cancelReason.trim()) {
      return toast.error('Please provide a reason for cancellation');
    }
    setIsCancelling(true);
    try {
      await api.patch(`/jobs/${id}/cancel`, { reason: cancelReason.trim() });
      toast.success('Job cancelled successfully');
      setShowCancelDialog(false);
      await fetchJob();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel job');
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle provider response to job offer
  const handleProviderResponse = async (action) => {
    try {
      await api.patch(`/jobs/${id}/respond`, { action });
      toast.success(action === 'accept' ? 'Job accepted! Work can begin.' : 'Job declined');
      await fetchJob();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  // Navigate to user profile
  const handleViewProfile = (userId) => {
    if (userId === currentUser?._id) {
      navigate('/dashboard/profile');
    } else {
      toast.info(`Viewing profile: ${userId}`);
    }
  };

  // Show loading state
  if (loading || redirecting) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading job details...</p>
        </div>
      </main>
    );
  }

  // Job not found
  if (!job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Job Not Found</h2>
          <p className="text-gray-600 mb-6">This job may have been removed or is no longer available.</p>
          <Button onClick={() => navigate('/jobs')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Browse Jobs
          </Button>
        </Card>
      </div>
    );
  }

  // Prepare computed values
  const urgency = formatUrgency(job.urgency);
  const status = formatStatus(job.status);
  const budgetHint = formatBudgetHint(job.budget, job.category);
  const isClient = currentUser?.role === 'customer' && job.client?._id === currentUser._id;
  const isProvider = currentUser?.role === 'provider';
  const isAssignedProvider = isProvider && job.assignedWorker?._id === currentUser._id;
  const canApply = isProvider && !isClient && !hasApplied && job.status === 'open';
  const canRespond = isAssignedProvider && job.status === 'pending_provider_acceptance';
  const canManage = isClient || currentUser?.role === 'admin';
  const isClosed = !['open', 'pending_provider_acceptance', 'assigned', 'escrow_funded'].includes(job.status);

  return (
    <>
      <Toaster />
      <main className="min-h-screen bg-background">
        {/* 🔙 Sticky Header */}
        <div className="border-b bg-card sticky top-0 z-30 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-foreground transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Jobs</span>
            </button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 📋 LEFT: Job Details (2/3 width on desktop) */}
          <div className="lg:col-span-2 space-y-5">
            {/* 🏷️ Header Card with Title, Status, Urgency */}
            <Card className="p-5 border-t-4 border-t-blue-500">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold text-foreground break-words">{job.title}</h1>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${status.class}`}>
                      {status.label}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${urgency.class}`}>
                      {urgency.label}
                    </span>
                    {job.escrow?.funded && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Escrow Secured
                      </span>
                    )}
                  </div>
                </div>
                {canManage && !isClosed && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" className="text-xs h-8">
                      <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                      <DialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="text-xs h-8">
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Cancel
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Cancel Job</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to cancel this job? This action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3 py-3">
                          <Label htmlFor="reason">Reason for cancellation</Label>
                          <Textarea
                            id="reason"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Briefly explain why you're cancelling..."
                            rows={3}
                          />
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowCancelDialog(false)}>Keep Job</Button>
                          <Button variant="destructive" onClick={handleCancelJob} disabled={isCancelling}>
                            {isCancelling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Confirm Cancel
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
              {/* 📊 Quick Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t">
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Budget</p>
                  <p className="font-bold text-sm text-green-700">Rs. {job.budget?.toLocaleString()}</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <Clock className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="font-bold text-sm">
                    {job.estimatedDuration?.value
                      ? `${job.estimatedDuration.value} ${job.estimatedDuration.unit}`
                      : 'Flexible'}
                  </p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <Briefcase className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">Category</p>
                  <p className="font-bold text-sm">{job.category}</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <Calendar className="w-4 h-4 text-orange-600 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">Posted</p>
                  <p className="font-bold text-sm">
                    {new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
            </Card>
            {/* 📍 Location & Timing */}
            <Card className="p-5">
              <CardTitle className="text-lg mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Location & Schedule
              </CardTitle>
              <CardContent className="space-y-3">
                <p className="flex items-start gap-2 text-foreground">
                  <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 mt-1" />
                  <span className="leading-relaxed">
                    {job.location?.address || 'Address not provided'}
                    {job.location?.city && <span className="text-gray-500">, {job.location.city}</span>}
                  </span>
                </p>
                {job.preferredDate && (
                  <p className="flex items-center gap-2 text-foreground">
                    <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    Preferred start: <span className="font-medium">{formatDate(job.preferredDate)}</span>
                  </p>
                )}
              </CardContent>
            </Card>
            {/* 📝 Description */}
            <Card className="p-5">
              <CardTitle className="text-lg mb-4">Job Description</CardTitle>
              <CardContent>
                <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed">
                  {job.description}
                </p>
              </CardContent>
            </Card>
            {/* 👤 Posted By (Client) */}
            {job.client && (
              <Card className="p-5">
                <CardTitle className="text-lg mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Posted by
                </CardTitle>
                <UserCard
                  user={job.client}
                  role="customer"
                  onViewProfile={handleViewProfile}
                  onMessage={isAssignedProvider ? (user) => toast.info(`Messaging ${user.fullName}`) : undefined}
                />
              </Card>
            )}
            {/* 👷 Assigned Provider (if any) */}
            {job.assignedWorker && (
              <Card className="p-5 border-l-4 border-l-green-500">
                <CardTitle className="text-lg mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-green-600" />
                  Assigned Provider
                </CardTitle>
                <UserCard
                  user={job.assignedWorker}
                  role="provider"
                  onViewProfile={handleViewProfile}
                  onMessage={isClient ? (user) => toast.info(`Messaging ${user.fullName}`) : undefined}
                  showRating={true}
                />
                {canRespond && (
                  <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800 mb-3 font-medium">
                      <AlertCircle className="w-4 h-4 inline -mt-0.5 mr-1" />
                      This provider is waiting for your response
                    </p>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleProviderResponse('accept')}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> Accept Offer
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() => handleProviderResponse('decline')}
                      >
                        <XCircle className="w-4 h-4 mr-2" /> Decline
                      </Button>
                    </div>
                  </div>
                )}
                {job.escrow?.funded && job.status === 'escrow_funded' && isAssignedProvider && (
                  <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-800 mb-3">
                      <ShieldCheck className="w-4 h-4 inline -mt-0.5 mr-1" />
                      Escrow is funded. You can start work now.
                    </p>
                    <Button className="w-full bg-purple-600 hover:bg-purple-700">
                      Start Work
                    </Button>
                  </div>
                )}
              </Card>
            )}
            {/* 💬 Applications List (Client View Only) */}
            {isClient && job.applications?.length > 0 && (
              <Card className="p-5">
                <CardTitle className="text-lg mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    Applications ({job.applications.length})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowApplications(!showApplications)}
                    className="text-xs"
                  >
                    {showApplications ? 'Hide' : 'Show'}
                  </Button>
                </CardTitle>
                {showApplications && (
                  <div className="space-y-3">
                    {job.applications.map((app) => (
                      <ApplicationCard
                        key={app._id}
                        application={app}
                        job={job}
                        isOwner={isClient}
                        onAccept={() => fetchJob()}
                      />
                    ))}
                  </div>
                )}
              </Card>
            )}
            {/* ⭐ Review (After Completion) */}
            {job.status === 'completed' && job.review && (
              <Card className="p-5 bg-emerald-50 border-emerald-200">
                <CardTitle className="text-lg mb-3 flex items-center gap-2 text-emerald-800">
                  <Star className="w-5 h-5 fill-emerald-500 text-emerald-500" />
                  Completed Review
                </CardTitle>
                <div className="flex items-start gap-3">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < job.review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-foreground/90">{job.review.comment || 'No comment provided'}</p>
                </div>
              </Card>
            )}
          </div>
          {/* 🎯 RIGHT: Action Panel (1/3 width on desktop) */}
          <div className="lg:col-span-1 space-y-5">
            {/* 💰 Budget & Pricing Info */}
            <Card className="p-5 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <CardTitle className="text-lg mb-3 flex items-center gap-2">
                <span className="text-green-600 font-bold">Rs.</span>
                Budget Details
              </CardTitle>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Client Budget:</span>
                  <span className="font-bold text-lg text-foreground text-green-700">Rs. {job.budget?.toLocaleString()}</span>
                </div>
                {canApply && (
                  <>
                    <Separator />
                    <p className="text-xs text-gray-500">Suggested proposal range:</p>
                    <p className="font-medium text-green-700">
                      Rs. {budgetHint.min.toLocaleString()} - Rs. {budgetHint.max.toLocaleString()}
                    </p>
                  </>
                )}
              </div>
            </Card>
            {/* 📬 Application Form (Provider) */}
            {hasApplied ? (
              <Card className="p-5 bg-green-50 border-green-200">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-green-500 text-white flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-green-900 text-lg">Application Sent!</h3>
                  <p className="text-sm text-green-800 mt-2">
                    The client will review your proposal. You'll be notified when they respond.
                  </p>
                  <Button variant="outline" className="mt-4 w-full" onClick={() => navigate('/dashboard/applications')}>
                    View My Applications
                  </Button>
                </div>
              </Card>
            ) : canApply ? (
              <Card className="p-5">
                <CardTitle className="text-lg mb-4">Submit Your Proposal</CardTitle>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="price" className="text-sm font-medium">Your Proposed Price</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
                        Rs.
                      </span>
                      <Input
                        id="price"
                        type="number"
                        value={proposedPrice}
                        onChange={(e) => setProposedPrice(e.target.value)}
                        className="pl-9 h-11"
                        placeholder={`${budgetHint.min}-${budgetHint.max}`}
                        min={budgetHint.min}
                        max={budgetHint.max}
                        aria-describedby="price-hint"
                      />
                    </div>
                    <p id="price-hint" className="text-xs text-gray-500 mt-1">
                      Suggested: Rs. {budgetHint.min.toLocaleString()} - Rs. {budgetHint.max.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="message" className="text-sm font-medium">Cover Message</Label>
                    <Textarea
                      id="message"
                      value={coverMessage}
                      onChange={(e) => setCoverMessage(e.target.value)}
                      rows={4}
                      maxLength={500}
                      className="resize-none mt-1"
                      placeholder="Briefly explain why you're the best fit for this job..."
                    />
                    <p className="text-xs text-gray-500 text-right mt-1">{coverMessage.length}/500</p>
                  </div>
                  <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800">
                      Tip: Mention relevant experience, timeline, and why you're a great fit.
                    </p>
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !proposedPrice || !coverMessage.trim()}
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                    ) : (
                      <><MessageSquare className="w-4 h-4 mr-2" /> Submit Proposal</>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11"
                    onClick={() => {
                      toast.success('Job saved to your watchlist!');
                    }}
                  >
                    <Star className="w-4 h-4 mr-2" /> Save Job
                  </Button>
                </form>
                {job.applications?.length > 0 && (
                  <p className="text-xs text-gray-500 text-center mt-4 pt-3 border-t">
                    {job.applications.length} proposal{job.applications.length !== 1 ? 's' : ''} received
                  </p>
                )}
              </Card>
            ) : (
              <Card className="p-5 text-center">
                {isClosed ? (
                  <div className="space-y-3">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto" />
                    <p className="font-medium text-foreground">Job No Longer Open</p>
                    <p className="text-sm text-gray-600">
                      This job is currently <span className="font-medium">{status.label.toLowerCase()}</span>.
                    </p>
                  </div>
                ) : isClient ? (
                  <div className="space-y-3">
                    <User className="w-12 h-12 text-blue-500 mx-auto" />
                    <p className="font-medium text-foreground">This is your job</p>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full" onClick={() => navigate(`/dashboard/jobs/${job._id}`)}>
                        <Edit2 className="w-4 h-4 mr-2" /> Manage Job
                      </Button>
                      {job.applications?.length > 0 && (
                        <Button
                          variant="default"
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          onClick={() => setShowApplications(true)}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" /> View {job.applications.length} Applications
                        </Button>
                      )}
                    </div>
                  </div>
                ) : !currentUser ? (
                  <div className="space-y-3">
                    <User className="w-12 h-12 text-gray-400 mx-auto" />
                    <p className="font-medium text-foreground">Log in to apply</p>
                    <Button onClick={() => navigate('/login', { state: { from: `/jobs/${id}` } })}>
                      Log In to Apply
                    </Button>
                    <p className="text-xs text-gray-500">
                      Create a provider account to start earning
                    </p>
                  </div>
                ) : currentUser.role !== 'provider' ? (
                  <div className="space-y-3">
                    <Briefcase className="w-12 h-12 text-gray-400 mx-auto" />
                    <p className="font-medium text-foreground">Providers Only</p>
                    <p className="text-sm text-gray-600">
                      Only registered service providers can apply to jobs.
                    </p>
                    <Button variant="outline" onClick={() => navigate('/signup')}>
                      Become a Provider
                    </Button>
                  </div>
                ) : null}
              </Card>
            )}
            {/* 🔗 Quick Actions */}
            <Card className="p-5">
              <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Quick Actions
              </CardTitle>
              <div className="space-y-2">
                <Button variant="ghost" className="w-full justify-start text-foreground hover:bg-gray-50" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" /> Share Job
                </Button>
                <Button variant="ghost" className="w-full justify-start text-foreground hover:bg-gray-50" size="sm">
                  <AlertCircle className="w-4 h-4 mr-2" /> Report Issue
                </Button>
                {currentUser && (
                  <Button variant="ghost" className="w-full justify-start text-foreground hover:bg-gray-50" size="sm">
                    <MessageSquare className="w-4 h-4 mr-2" /> Contact Support
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}