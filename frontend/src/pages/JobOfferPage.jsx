import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Clock, Check, X, Users, AlertCircle, RefreshCw, UserCheck } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import api from '@/api/api';

// Helpers
const formatCurrency = (amt) => amt ? `Rs. ${Number(amt).toLocaleString()}` : 'N/A';
const formatTimeAgo = (date) => {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// 🔹 Helper: Calculate effective applicant count (includes direct hires)
const getEffectiveApplicantCount = (job) => {
  // Direct hire: assignedWorker exists but no applications yet
  if (job.assignedWorker && (!job.applications || job.applications.length === 0)) {
    return 1;
  }
  // Normal flow: count applications array
  return job.applications?.length || 0;
};

export default function JobOffersPage() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  
  // Provider state
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [actingOfferId, setActingOfferId] = useState(null);
  const [declineConfirmId, setDeclineConfirmId] = useState(null);
  
  // Client state
  const [myJobs, setMyJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [actingJobId, setActingJobId] = useState(null);
  const [rejectConfirm, setRejectConfirm] = useState({ jobId: null, appId: null });

  // Get user from localStorage
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr);
        setUser(parsed);
        setUserRole(parsed.role);
      } catch (e) {
        console.error('Failed to parse user', e);
      }
    }
  }, []);

  // Load provider offers: /jobs/offers
  const loadOffers = useCallback(async () => {
    try {
      setOffersLoading(true);
      const res = await api.get('/jobs/offers');
      const data = res.data?.jobs || res.data?.data?.jobs || res.data || [];
      setOffers(data);
    } catch (err) {
      console.error('Failed to load offers:', err);
      if (err.response?.status !== 404) toast.error('Failed to load job offers');
    } finally {
      setOffersLoading(false);
    }
  }, []);

  // Load client jobs with applications: /jobs/my
  const loadMyJobs = useCallback(async () => {
    try {
      setJobsLoading(true);
      const res = await api.get('/jobs/my');
      const data = res.data?.jobs || res.data?.data?.jobs || res.data || [];
      // Only show jobs that have applications or are pending provider response
      const withActivity = data.filter(j => 
        j.applications?.length > 0 || j.status === 'pending_provider_acceptance'
      );
      setMyJobs(withActivity);
    } catch (err) {
      console.error('Failed to load jobs:', err);
      if (err.response?.status !== 404) toast.error('Failed to load your jobs');
    } finally {
      setJobsLoading(false);
    }
  }, []);

  // Load data based on role
  useEffect(() => {
    if (!userRole) return;
    if (userRole === 'provider') loadOffers();
    if (userRole === 'customer') loadMyJobs();
  }, [userRole, loadOffers, loadMyJobs]);

  // ===== PROVIDER ACTIONS =====
  const handleAcceptOffer = async (jobId) => {
    setActingOfferId(jobId);
    try {
      await api.patch(`/jobs/${jobId}/respond`, { action: 'accept' });
      setOffers(prev => prev.filter(j => j._id !== jobId));
      toast.success('Job accepted! Work can begin.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept');
    } finally {
      setActingOfferId(null);
    }
  };

  const handleDeclineOffer = async (jobId) => {
    setActingOfferId(jobId);
    try {
      await api.patch(`/jobs/${jobId}/respond`, { action: 'decline' });
      setOffers(prev => prev.filter(j => j._id !== jobId));
      toast.info('Job offer declined');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline');
    } finally {
      setActingOfferId(null);
      setDeclineConfirmId(null);
    }
  };

  // ===== CLIENT ACTIONS =====
  const handleAcceptApplication = async (jobId, applicationId) => {
    setActingJobId(`${jobId}-${applicationId}`);
    try {
      await api.patch(`/jobs/${jobId}/accept-application/${applicationId}`);
      // Update local state: move job to pending_provider_acceptance
      setMyJobs(prev => prev.map(j => 
        j._id === jobId 
          ? { ...j, status: 'pending_provider_acceptance', assignedWorker: applicationId }
          : j
      ));
      toast.success('Provider selected. Awaiting their acceptance.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept application');
    } finally {
      setActingJobId(null);
    }
  };

  const handleRejectApplication = async (jobId, applicationId) => {
    // For MVP: just remove from local list (backend can implement reject logic later)
    setMyJobs(prev => prev.map(j => 
      j._id === jobId 
        ? { ...j, applications: j.applications?.filter(a => a.worker !== applicationId) }
        : j
    ));
    toast.info('Application rejected');
    setRejectConfirm({ jobId: null, appId: null });
  };

  // ===== RENDER =====
  if (!userRole) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  // 🔹 PROVIDER VIEW: Job Offers (Accept/Decline)
  if (userRole === 'provider') {
    if (offersLoading) {
      return (
        <div className="p-8 text-center">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading job offers...</p>
        </div>
      );
    }

    return (
      <>
        <Toaster />
        <div className="p-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Job Offers</h1>
            <Button variant="outline" size="sm" onClick={loadOffers} disabled={offersLoading}>
              <RefreshCw className="w-4 h-4 mr-2" />Refresh
            </Button>
          </div>

          {offers.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No job offers awaiting your response.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {offers.map(job => (
                <Card key={job._id} className="p-5 border-l-4 border-l-blue-500">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{job.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{job.description}</p>
                      <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" /> {job.location?.city || job.location?.address}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" /> {formatTimeAgo(job.createdAt)}
                        </span>
                        <span className="font-medium text-green-600">{formatCurrency(job.budget)}</span>
                      </div>
                      <div className="mt-3 text-xs text-blue-600 bg-blue-50 inline-block px-2 py-1 rounded">
                        🎯 Direct hire from {job.client?.fullName || 'Client'}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 min-w-[140px]">
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleAcceptOffer(job._id)}
                        disabled={actingOfferId === job._id}
                      >
                        {actingOfferId === job._id ? '...' : <><Check className="w-4 h-4 mr-1"/>Accept</>}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => setDeclineConfirmId(job._id)}
                        disabled={actingOfferId === job._id}
                      >
                        <X className="w-4 h-4 mr-1"/>Decline
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Decline Confirmation */}
        <AlertDialog open={declineConfirmId !== null} onOpenChange={(o) => !o && setDeclineConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Decline this offer?</AlertDialogTitle>
              <AlertDialogDescription>This cannot be undone. The client will be notified.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => handleDeclineOffer(declineConfirmId)} 
                className="bg-red-600 hover:bg-red-700"
              >
                Decline
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // 🔹 CLIENT VIEW: Applications on My Jobs (Accept/Reject per applicant)
  if (userRole === 'customer') {
    if (jobsLoading) {
      return (
        <div className="p-8 text-center">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading your jobs...</p>
        </div>
      );
    }

    return (
      <>
        <Toaster />
        <div className="p-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Applications on Your Jobs</h1>
            <Button variant="outline" size="sm" onClick={loadMyJobs} disabled={jobsLoading}>
              <RefreshCw className="w-4 h-4 mr-2" />Refresh
            </Button>
          </div>

          {myJobs.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No applications on your posted jobs yet.</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {myJobs.map(job => {
                // 🔹 Calculate effective applicant count for this job
                const applicantCount = getEffectiveApplicantCount(job);
                const isDirectHire = job.assignedWorker && (!job.applications || job.applications.length === 0);
                
                return (
                  <Card key={job._id} className="p-5">
                    {/* Job Header */}
                    <div className="flex items-start justify-between mb-4 pb-4 border-b">
                      <div>
                        <h3 className="font-semibold text-lg">{job.title}</h3>
                        <p className="text-sm text-muted-foreground">{job.description?.slice(0, 120)}...</p>
                        <div className="flex gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                          <span>{formatCurrency(job.budget)}</span>
                          <span>•</span>
                          <span className={applicantCount > 0 ? 'font-semibold text-blue-600' : ''}>
                            {applicantCount} applicant{applicantCount !== 1 ? 's' : ''}
                          </span>
                          {isDirectHire && (
                            <span className="text-purple-600">• Direct hire</span>
                          )}
                          {job.status === 'pending_provider_acceptance' && (
                            <span className="text-blue-600">• Awaiting provider response</span>
                          )}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${
                        job.status === 'open' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        job.status === 'pending_provider_acceptance' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                        {job.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Applications List */}
                    {job.applications?.length > 0 && job.status === 'open' && (
                      <div className="space-y-3">
                        {job.applications.map(app => {
                          const worker = app.worker;
                          const isActing = actingJobId === `${job._id}-${app._id}`;
                          return (
                            <div key={app._id} className="flex items-start justify-between gap-4 p-3 bg-muted/30 rounded-lg">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={worker?.avatar || '/placeholder.svg'} 
                                  alt={worker?.fullName}
                                  className="w-10 h-10 rounded-full"
                                />
                                <div>
                                  <p className="font-medium">{worker?.fullName || 'Provider'}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Applied {formatTimeAgo(app.appliedAt)}
                                    {app.proposedPrice && ` • Proposed: ${formatCurrency(app.proposedPrice)}`}
                                  </p>
                                  {app.message && (
                                    <p className="text-sm mt-1 text-muted-foreground line-clamp-1">"{app.message}"</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleAcceptApplication(job._id, app._id)}
                                  disabled={isActing}
                                >
                                  {isActing ? '...' : <><Check className="w-4 h-4 mr-1"/>Accept</>}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="border-red-300 text-red-600 hover:bg-red-50"
                                  onClick={() => setRejectConfirm({ jobId: job._id, appId: app._id })}
                                  disabled={isActing}
                                >
                                  <X className="w-4 h-4 mr-1"/>Reject
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Direct Hire State */}
                    {isDirectHire && job.status === 'pending_provider_acceptance' && (
                      <div className="text-center py-4 text-purple-600 bg-purple-50 rounded-lg">
                        <UserCheck className="w-5 h-5 mx-auto mb-2" />
                        <p className="font-medium">Direct hire: Waiting for {job.assignedWorker?.fullName || 'provider'} to respond</p>
                        <p className="text-sm text-muted-foreground">They can accept or decline your offer</p>
                      </div>
                    )}

                    {/* Pending Provider Response State (normal application flow) */}
                    {!isDirectHire && job.status === 'pending_provider_acceptance' && (
                      <div className="text-center py-4 text-blue-600 bg-blue-50 rounded-lg">
                        <Users className="w-5 h-5 mx-auto mb-2" />
                        <p className="font-medium">Waiting for {job.assignedWorker?.fullName || 'provider'} to respond</p>
                        <p className="text-sm text-muted-foreground">They can accept or decline your offer</p>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Reject Application Confirmation */}
        <AlertDialog 
          open={rejectConfirm.jobId !== null} 
          onOpenChange={(o) => !o && setRejectConfirm({ jobId: null, appId: null })}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reject this application?</AlertDialogTitle>
              <AlertDialogDescription>The provider will be notified. This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => handleRejectApplication(rejectConfirm.jobId, rejectConfirm.appId)} 
                className="bg-red-600 hover:bg-red-700"
              >
                Reject
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Fallback
  return (
    <div className="p-8 text-center">
      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
      <p className="text-muted-foreground">Please log in to view job offers or applications.</p>
    </div>
  );
}