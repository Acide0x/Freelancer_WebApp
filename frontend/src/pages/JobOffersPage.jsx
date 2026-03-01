import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LayoutGrid, List, MapPin, Calendar, DollarSign, Clock, Trash2, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import api from '@/api/api'; // 🔌 Use the pre-configured api client

// ============================================================================
// 🎨 UI HELPERS
// ============================================================================
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getUrgencyStyles(urgency) {
  switch (urgency) {
    case 'urgent': return 'bg-red-100 text-red-700 border-red-300';
    case 'high': return 'bg-orange-100 text-orange-700 border-orange-300';
    case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    case 'low': return 'bg-gray-100 text-gray-700 border-gray-300';
    default: return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

// ============================================================================
// 🃏 JOB CARD COMPONENT
// ============================================================================
function JobCard({ job, viewMode, onAccept, onDecline, acceptingId, decliningId }) {
  const isDisabled = acceptingId === job._id || decliningId === job._id;

  if (viewMode === 'list') {
    return (
      <Card className="p-6 hover:shadow-md transition-shadow mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="font-bold text-lg text-foreground">{job.title}</h3>
                <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold border ${getUrgencyStyles(job.urgency)}`}>
                  {job.urgency.charAt(0).toUpperCase() + job.urgency.slice(1)}
                </span>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">${job.budget.toLocaleString()}</p>
                <p className="text-xs text-foreground/60">{formatTimeAgo(job.createdAt)}</p>
              </div>
            </div>
            <p className="text-sm text-foreground/70 mb-3 line-clamp-2">{job.description}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-foreground/50" />
                <span className="text-foreground/70">{job.location.city}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-foreground/50" />
                <span className="text-foreground/70">{job.estimatedDuration?.value} {job.estimatedDuration?.unit}</span>
              </div>
              <div className="flex items-center gap-2">
                <img src={job.client.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'} alt={job.client.fullName} className="w-5 h-5 rounded-full" />
                <span className="text-foreground/70">{job.client.fullName}</span>
                {job.client.isVerified && <span className="text-green-600 text-xs">✓</span>}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-foreground/50" />
                <span className="text-foreground/70">{formatTimeAgo(job.createdAt)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button size="sm" className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white" onClick={() => onAccept(job._id)} disabled={isDisabled}>
              {acceptingId === job._id ? <><span className="animate-spin mr-2">⏳</span>Accepting...</> : <><Check className="w-4 h-4 mr-1" />Accept</>}
            </Button>
            <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={() => onDecline(job._id)} disabled={isDisabled}>
              {decliningId === job._id ? <><span className="animate-spin mr-2">⏳</span>Declining...</> : <><Trash2 className="w-4 h-4 mr-1" />Decline</>}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full">
      <div className="relative bg-gradient-to-br from-blue-50 to-green-50 p-4 border-b border-border">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-bold text-lg text-foreground leading-tight">{job.title}</h3>
          <span className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-semibold border ${getUrgencyStyles(job.urgency)}`}>
            {job.urgency.charAt(0).toUpperCase() + job.urgency.slice(1)}
          </span>
        </div>
        <p className="text-2xl font-bold text-green-600 mb-2">${job.budget.toLocaleString()}</p>
        <p className="text-xs text-foreground/60">{formatTimeAgo(job.createdAt)}</p>
      </div>
      <div className="p-4 flex-1">
        <p className="text-sm text-foreground/70 mb-4 line-clamp-3">{job.description}</p>
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-foreground/50 flex-shrink-0" />
            <span className="text-foreground/70">{job.location.address}{job.location.city ? `, ${job.location.city}` : ''}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-foreground/50 flex-shrink-0" />
            <span className="text-foreground/70">{job.estimatedDuration?.value} {job.estimatedDuration?.unit}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <img src={job.client.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'} alt={job.client.fullName} className="w-5 h-5 rounded-full flex-shrink-0" />
            <span className="text-foreground/70">{job.client.fullName}</span>
            {job.client.isVerified && <span className="text-green-600 text-xs font-bold">✓ Verified</span>}
          </div>
        </div>
      </div>
      <div className="p-4 border-t border-border flex gap-2">
        <Button className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white" onClick={() => onAccept(job._id)} disabled={isDisabled}>
          {acceptingId === job._id ? <><span className="animate-spin mr-2">⏳</span>Accepting...</> : <><Check className="w-4 h-4 mr-1" />Accept</>}
        </Button>
        <Button variant="outline" className="flex-1 border-red-300 text-red-600 hover:bg-red-50" onClick={() => onDecline(job._id)} disabled={isDisabled}>
          {decliningId === job._id ? <><span className="animate-spin mr-2">⏳</span>Declining...</> : <><Trash2 className="w-4 h-4 mr-1" />Decline</>}
        </Button>
      </div>
    </Card>
  );
}

// ============================================================================
// 📄 MAIN PAGE COMPONENT
// ============================================================================
export default function JobOffersPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [acceptingId, setAcceptingId] = useState(null);
  const [decliningId, setDecliningId] = useState(null);
  const [declineJobId, setDeclineJobId] = useState(null);
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [budgetFilter, setBudgetFilter] = useState(0);

  // 🔄 Fetch jobs on mount
  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // ✅ Use api.get() like in WorkersPage
      const response = await api.get('/jobs', {
        params: { status: 'pending_provider_acceptance' }
      });
      
      // Handle different possible response structures
      const data = response.data;
      const jobsList = Array.isArray(data) 
        ? data 
        : data?.jobs 
        || data?.data?.jobs 
        || data?.data 
        || [];
        
      setJobs(jobsList);
    } catch (err) {
      console.error('Failed to load job offers:', err);
      const message = err.response?.data?.message || err.message || 'Failed to load job offers';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (jobId) => {
    setAcceptingId(jobId);
    try {
      // ✅ Use api.patch() for responding
      const response = await api.patch(`/jobs/${jobId}/respond`, {
        action: 'accept'
      });
      
      setJobs((prev) => prev.filter((job) => job._id !== jobId));
      toast.success(response.data?.message || 'Job accepted! Work can now begin.');
    } catch (err) {
      console.error('Accept failed:', err);
      const message = err.response?.data?.message || err.message || 'Failed to accept job';
      toast.error(message);
    } finally {
      setAcceptingId(null);
    }
  };

  const handleDecline = async (jobId) => {
    setDecliningId(jobId);
    try {
      // ✅ Use api.patch() for responding
      const response = await api.patch(`/jobs/${jobId}/respond`, {
        action: 'decline'
      });
      
      setJobs((prev) => prev.filter((job) => job._id !== jobId));
      toast.info(response.data?.message || 'Job offer declined.');
    } catch (err) {
      console.error('Decline failed:', err);
      const message = err.response?.data?.message || err.message || 'Failed to decline job';
      toast.error(message);
    } finally {
      setDecliningId(null);
      setDeclineJobId(null);
    }
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const urgencyMatch = urgencyFilter === 'all' || job.urgency === urgencyFilter;
      const budgetMatch = budgetFilter === 0 || job.budget >= budgetFilter;
      return urgencyMatch && budgetMatch;
    });
  }, [jobs, urgencyFilter, budgetFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-foreground/40" />
          <p className="text-foreground/60">Loading job offers...</p>
        </div>
      </div>
    );
  }

  if (error && jobs.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Jobs</h3>
          <p className="text-foreground/60 mb-4">{error}</p>
          <Button onClick={loadJobs}>Try Again</Button>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Toaster />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-card border-b border-border sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Job Offers</h1>
                <p className="text-sm text-foreground/60 mt-1">
                  {filteredJobs.length} {filteredJobs.length === 1 ? 'offer' : 'offers'} awaiting your response
                </p>
              </div>
              <div className="flex gap-1 border border-border rounded-lg p-1">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-foreground/60 hover:text-foreground'}`} title="Grid view"><LayoutGrid className="w-5 h-5" /></button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-foreground/60 hover:text-foreground'}`} title="List view"><List className="w-5 h-5" /></button>
              </div>
            </div>
            {/* Filter Bar */}
            <div className="flex gap-4 flex-wrap">
              <div>
                <label className="text-xs font-semibold text-foreground/60 block mb-1">Urgency</label>
                <select value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">All Urgencies</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground/60 block mb-1">Min Budget</label>
                <select value={budgetFilter} onChange={(e) => setBudgetFilter(Number(e.target.value))} className="px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="0">Any Budget</option>
                  <option value="1000">$1,000+</option>
                  <option value="2000">$2,000+</option>
                  <option value="3000">$3,000+</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" size="sm" onClick={loadJobs} disabled={loading}><RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {filteredJobs.length > 0 ? (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : ''}>
              {filteredJobs.map((job) => (
                <JobCard key={job._id} job={job} viewMode={viewMode} onAccept={handleAccept} onDecline={() => setDeclineJobId(job._id)} acceptingId={acceptingId} decliningId={decliningId} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <DollarSign className="w-16 h-16 text-foreground/20 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Pending Offers</h3>
              <p className="text-foreground/60">
                {jobs.length === 0 ? 'No job offers are currently awaiting your response. Check back soon!' : 'No offers match your current filters. Try adjusting them.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Decline Confirmation Dialog */}
      <AlertDialog open={declineJobId !== null} onOpenChange={(open) => !open && setDeclineJobId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline Job Offer?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to decline this job offer? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => declineJobId && handleDecline(declineJobId)} className="bg-red-600 hover:bg-red-700">Decline</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}