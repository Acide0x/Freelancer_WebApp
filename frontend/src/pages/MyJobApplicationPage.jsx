import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  LayoutGrid, List, MapPin, Calendar, Clock, Trash2, Check, 
  AlertCircle, RefreshCw, Users, Eye, Pencil, XCircle, 
  UserCheck, FileText, ArrowRight, Briefcase, Send
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import api from '@/api/api';

// ============================================================================
// 🎨 UI HELPERS
// ============================================================================

function formatTimeAgo(dateString) {
  if (!dateString) return 'Unknown';
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

function formatCurrency(amount) {
  if (!amount && amount !== 0) return 'N/A';
  return `Rs. ${Number(amount).toLocaleString()}`;
}

function getUrgencyStyles(urgency) {
  const styles = {
    urgent: 'bg-red-100 text-red-700 border-red-300',
    high: 'bg-orange-100 text-orange-700 border-orange-300',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    low: 'bg-gray-100 text-gray-700 border-gray-300',
  };
  return styles[urgency] || styles.low;
}

function getStatusStyles(status) {
  const styles = {
    open: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    pending_provider_acceptance: 'bg-blue-100 text-blue-700 border-blue-300',
    assigned: 'bg-purple-100 text-purple-700 border-purple-300',
    escrow_funded: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    in_progress: 'bg-cyan-100 text-cyan-700 border-cyan-300',
    completed: 'bg-green-100 text-green-700 border-green-300',
    cancelled: 'bg-red-100 text-red-700 border-red-300',
    disputed: 'bg-orange-100 text-orange-700 border-orange-300',
    resolved: 'bg-teal-100 text-teal-700 border-teal-300',
  };
  return styles[status] || styles.open;
}

function formatStatus(status) {
  if (!status) return 'Unknown';
  return status
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ============================================================================
// 🃏 PROVIDER JOB OFFER CARD (Incoming offers awaiting response)
// ============================================================================
function ProviderOfferCard({ job, viewMode, onAccept, onDecline, acceptingId, decliningId }) {
  const isDisabled = acceptingId === job._id || decliningId === job._id;
  const isDirectHire = job.flow === 'direct_hire' || (job.assignedWorker && !job.applications?.length);
  
  const getOfferTypeBadge = () => {
    if (isDirectHire) {
      return <Badge className="bg-purple-100 text-purple-700 border-purple-300">Direct Hire</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-700 border-blue-300">Application Accepted</Badge>;
  };

  if (viewMode === 'list') {
    return (
      <Card className="p-6 hover:shadow-md transition-shadow mb-4 border-l-4 border-l-blue-500">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
              <div>
                <h3 className="font-bold text-lg text-foreground">{job.title}</h3>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {getOfferTypeBadge()}
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getUrgencyStyles(job.urgency)}`}>
                    {job.urgency?.charAt(0).toUpperCase() + job.urgency?.slice(1)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">{formatCurrency(job.budget)}</p>
                <p className="text-xs text-foreground/60">{formatTimeAgo(job.createdAt)}</p>
              </div>
            </div>
            <p className="text-sm text-foreground/70 mb-3 line-clamp-2">{job.description}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-foreground/50" />
                <span className="text-foreground/70">{job.location?.city || job.location?.address || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-foreground/50" />
                <span className="text-foreground/70">
                  {job.estimatedDuration?.value} {job.estimatedDuration?.unit || 'hours'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <img 
                  src={job.client?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'} 
                  alt={job.client?.fullName} 
                  className="w-5 h-5 rounded-full" 
                />
                <span className="text-foreground/70">{job.client?.fullName || 'Client'}</span>
                {job.client?.isVerified && <span className="text-green-600 text-xs">✓</span>}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-foreground/50" />
                <span className="text-foreground/70">{formatTimeAgo(job.createdAt)}</span>
              </div>
            </div>
            <div className="text-xs text-foreground/50 bg-muted/50 p-2 rounded mb-3">
              {isDirectHire 
                ? '🎯 Client directly invited you' 
                : ' Your application was accepted'}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0 flex-col">
            <Button 
              size="sm" 
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white" 
              onClick={() => onAccept(job._id)} 
              disabled={isDisabled}
            >
              {acceptingId === job._id ? <><span className="animate-spin mr-2">⏳</span>Accepting...</> : <><Check className="w-4 h-4 mr-1" />Accept</>}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="border-red-300 text-red-600 hover:bg-red-50" 
              onClick={() => onDecline(job._id)} 
              disabled={isDisabled}
            >
              {decliningId === job._id ? <><span className="animate-spin mr-2">⏳</span>Declining...</> : <><Trash2 className="w-4 h-4 mr-1" />Decline</>}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full border-l-4 border-l-blue-500">
      <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 p-4 border-b border-border">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-bold text-lg text-foreground leading-tight">{job.title}</h3>
          <div className="flex flex-col items-end gap-1">
            {getOfferTypeBadge()}
            <span className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-semibold border ${getUrgencyStyles(job.urgency)}`}>
              {job.urgency?.charAt(0).toUpperCase() + job.urgency?.slice(1)}
            </span>
          </div>
        </div>
        <p className="text-2xl font-bold text-green-600 mb-2">{formatCurrency(job.budget)}</p>
        <p className="text-xs text-foreground/60">{formatTimeAgo(job.createdAt)}</p>
      </div>
      <div className="p-4 flex-1">
        <p className="text-sm text-foreground/70 mb-4 line-clamp-3">{job.description}</p>
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-foreground/50 flex-shrink-0" />
            <span className="text-foreground/70">{job.location?.address}{job.location?.city ? `, ${job.location.city}` : ''}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-foreground/50 flex-shrink-0" />
            <span className="text-foreground/70">{job.estimatedDuration?.value} {job.estimatedDuration?.unit || 'hours'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <img src={job.client?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'} alt={job.client?.fullName} className="w-5 h-5 rounded-full flex-shrink-0" />
            <span className="text-foreground/70">{job.client?.fullName || 'Client'}</span>
            {job.client?.isVerified && <span className="text-green-600 text-xs font-bold">✓ Verified</span>}
          </div>
        </div>
        <div className="text-xs text-foreground/50 bg-muted/50 p-2 rounded mb-3">
          {isDirectHire ? '🎯 Direct hire' : ' Application accepted'}
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
// 🃏 PROVIDER APPLICATION CARD (Jobs they applied to)
// ============================================================================
function ProviderApplicationCard({ job, viewMode }) {
  const application = job.applications?.find(app => true); // Just get first for display
  const appStatus = job.status === 'assigned' || job.status === 'pending_provider_acceptance' 
    ? (job.assignedWorker ? 'accepted' : 'pending') 
    : job.status === 'cancelled' ? 'cancelled' 
    : job.status === 'completed' ? 'completed' 
    : 'pending';

  const getStatusBadge = () => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      accepted: 'bg-green-100 text-green-700 border-green-300',
      rejected: 'bg-red-100 text-red-700 border-red-300',
      cancelled: 'bg-gray-100 text-gray-700 border-gray-300',
      completed: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    };
    const labels = { pending: 'Pending', accepted: 'Accepted', rejected: 'Not Selected', cancelled: 'Cancelled', completed: 'Completed' };
    return <Badge className={`${styles[appStatus]} border`}>{labels[appStatus]}</Badge>;
  };

  if (viewMode === 'list') {
    return (
      <Card className="p-6 hover:shadow-md transition-shadow mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
              <div>
                <h3 className="font-bold text-lg text-foreground">{job.title}</h3>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {getStatusBadge()}
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getUrgencyStyles(job.urgency)}`}>
                    {job.urgency?.charAt(0).toUpperCase() + job.urgency?.slice(1)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">{formatCurrency(job.budget)}</p>
                <p className="text-xs text-foreground/60">{formatTimeAgo(job.createdAt)}</p>
              </div>
            </div>
            <p className="text-sm text-foreground/70 mb-3 line-clamp-2">{job.description}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-foreground/50" />
                <span className="text-foreground/70">{job.location?.city || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-foreground/50" />
                <span className="text-foreground/70">{job.estimatedDuration?.value} {job.estimatedDuration?.unit || 'hours'}</span>
              </div>
              <div className="flex items-center gap-2">
                <img src={job.client?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'} alt={job.client?.fullName} className="w-5 h-5 rounded-full" />
                <span className="text-foreground/70">{job.client?.fullName || 'Client'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-foreground/50" />
                <span className="text-foreground/70">Applied {formatTimeAgo(application?.appliedAt || job.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full">
      <div className="relative bg-gradient-to-br from-gray-50 to-blue-50 p-4 border-b border-border">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-bold text-lg text-foreground leading-tight">{job.title}</h3>
          <div className="flex flex-col items-end gap-1">
            {getStatusBadge()}
            <span className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-semibold border ${getUrgencyStyles(job.urgency)}`}>
              {job.urgency?.charAt(0).toUpperCase() + job.urgency?.slice(1)}
            </span>
          </div>
        </div>
        <p className="text-2xl font-bold text-green-600 mb-2">{formatCurrency(job.budget)}</p>
        <p className="text-xs text-foreground/60">Applied {formatTimeAgo(application?.appliedAt || job.createdAt)}</p>
      </div>
      <div className="p-4 flex-1">
        <p className="text-sm text-foreground/70 mb-4 line-clamp-3">{job.description}</p>
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-foreground/50 flex-shrink-0" />
            <span className="text-foreground/70">{job.location?.address}{job.location?.city ? `, ${job.location.city}` : ''}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-foreground/50 flex-shrink-0" />
            <span className="text-foreground/70">{job.estimatedDuration?.value} {job.estimatedDuration?.unit || 'hours'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <img src={job.client?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'} alt={job.client?.fullName} className="w-5 h-5 rounded-full flex-shrink-0" />
            <span className="text-foreground/70">{job.client?.fullName || 'Client'}</span>
            {job.client?.isVerified && <span className="text-green-600 text-xs font-bold">✓ Verified</span>}
          </div>
        </div>
      </div>
      <div className="p-4 border-t border-border">
        {appStatus === 'accepted' && job.status === 'pending_provider_acceptance' && (
          <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">⏳ Awaiting your response to start</p>
        )}
        {appStatus === 'pending' && (
          <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">📬 Client is reviewing applications</p>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// 🃏 CLIENT JOB POSTING CARD (Jobs they posted with applications)
// ============================================================================
function ClientJobCard({ job, viewMode, onViewApplicants, onEdit, onClose, closingId }) {
  const isClosing = closingId === job._id;
  const applicationCount = job.applications?.length || 0;
  const hasPendingOffer = job.status === 'pending_provider_acceptance';
  const isAwaitingResponse = hasPendingOffer && job.assignedWorker;

  if (viewMode === 'list') {
    return (
      <Card className="p-6 hover:shadow-md transition-shadow mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
              <div>
                <h3 className="font-bold text-lg text-foreground">{job.title}</h3>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getUrgencyStyles(job.urgency)}`}>
                    {job.urgency?.charAt(0).toUpperCase() + job.urgency?.slice(1)}
                  </span>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusStyles(job.status)}`}>
                    {formatStatus(job.status)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">{formatCurrency(job.budget)}</p>
                <p className="text-xs text-foreground/60">{formatTimeAgo(job.createdAt)}</p>
              </div>
            </div>
            <p className="text-sm text-foreground/70 mb-3 line-clamp-2">{job.description}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-foreground/50" />
                <span className="text-foreground/70">{job.location?.city || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-foreground/50" />
                <span className="text-foreground/70">{job.estimatedDuration?.value} {job.estimatedDuration?.unit || 'hours'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-foreground/50" />
                <span className={`text-foreground/70 ${applicationCount > 0 ? 'font-semibold text-blue-600' : ''}`}>
                  {applicationCount} applicant{applicationCount !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-foreground/50" />
                <span className="text-foreground/70">{formatTimeAgo(job.createdAt)}</span>
              </div>
            </div>
            {isAwaitingResponse && (
              <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded mb-3 flex items-center gap-1">
                <UserCheck className="w-3 h-3" />
                Awaiting provider response
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0 flex-col">
            <Button size="sm" variant="outline" onClick={() => onViewApplicants(job._id)} disabled={job.status !== 'open' && !hasPendingOffer} className={applicationCount > 0 ? 'border-blue-300 text-blue-600 hover:bg-blue-50' : ''}>
              <Eye className="w-4 h-4 mr-1" />{applicationCount > 0 ? `View ${applicationCount}` : 'View'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => onEdit(job._id)} disabled={job.status !== 'open' && !hasPendingOffer}>
              <Pencil className="w-4 h-4 mr-1" />Edit
            </Button>
            {(job.status === 'open' || hasPendingOffer) && (
              <Button size="sm" variant="destructive" onClick={() => onClose(job._id)} disabled={isClosing}>
                {isClosing ? <><span className="animate-spin mr-2">⏳</span>Closing...</> : <><XCircle className="w-4 h-4 mr-1" />Close</>}
              </Button>
            )}
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
          <div className="flex flex-col items-end gap-1">
            <span className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-semibold border ${getUrgencyStyles(job.urgency)}`}>
              {job.urgency?.charAt(0).toUpperCase() + job.urgency?.slice(1)}
            </span>
            <span className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-semibold border ${getStatusStyles(job.status)}`}>
              {formatStatus(job.status)}
            </span>
          </div>
        </div>
        <p className="text-2xl font-bold text-green-600 mb-2">{formatCurrency(job.budget)}</p>
        <p className="text-xs text-foreground/60">{formatTimeAgo(job.createdAt)}</p>
      </div>
      <div className="p-4 flex-1">
        <p className="text-sm text-foreground/70 mb-4 line-clamp-3">{job.description}</p>
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-foreground/50 flex-shrink-0" />
            <span className="text-foreground/70">{job.location?.address}{job.location?.city ? `, ${job.location.city}` : ''}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-foreground/50 flex-shrink-0" />
            <span className="text-foreground/70">{job.estimatedDuration?.value} {job.estimatedDuration?.unit || 'hours'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-foreground/50 flex-shrink-0" />
            <span className={`text-foreground/70 ${applicationCount > 0 ? 'font-semibold text-blue-600' : ''}`}>
              {applicationCount} applicant{applicationCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        {isAwaitingResponse && (
          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded mb-3 flex items-center gap-1">
            <UserCheck className="w-3 h-3" />
            Provider reviewing your offer
          </div>
        )}
      </div>
      <div className="p-4 border-t border-border flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => onViewApplicants(job._id)} disabled={job.status !== 'open' && !hasPendingOffer}>
          <Eye className="w-4 h-4 mr-1" />{applicationCount > 0 ? `View ${applicationCount} Applicants` : 'View Applicants'}
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => onEdit(job._id)} disabled={job.status !== 'open' && !hasPendingOffer}>
          <Pencil className="w-4 h-4 mr-1" />Edit
        </Button>
        {(job.status === 'open' || hasPendingOffer) && (
          <Button variant="destructive" className="flex-1" onClick={() => onClose(job._id)} disabled={isClosing}>
            {isClosing ? <><span className="animate-spin mr-2">⏳</span>Closing...</> : <><XCircle className="w-4 h-4 mr-1" />Close</>}
          </Button>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// 📄 MAIN PAGE COMPONENT
// ============================================================================
export default function JobOffersPage() {
  // ===== USER ROLE (from localStorage) =====
  const [userRole, setUserRole] = useState(null);
  
  // ===== PROVIDER STATE =====
  const [providerOffers, setProviderOffers] = useState([]); // Jobs awaiting provider response
  const [providerApplications, setProviderApplications] = useState([]); // Jobs provider applied to
  const [providerLoading, setProviderLoading] = useState(true);
  const [providerError, setProviderError] = useState(null);
  const [acceptingId, setAcceptingId] = useState(null);
  const [decliningId, setDecliningId] = useState(null);
  const [declineJobId, setDeclineJobId] = useState(null);
  const [providerActiveTab, setProviderActiveTab] = useState('offers'); // 'offers' | 'applications'
  
  // ===== CLIENT STATE =====
  const [clientJobs, setClientJobs] = useState([]);
  const [clientLoading, setClientLoading] = useState(true);
  const [clientError, setClientError] = useState(null);
  const [closingId, setClosingId] = useState(null);
  
  // ===== UI STATE =====
  const [viewMode, setViewMode] = useState('grid');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [budgetFilter, setBudgetFilter] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');

  // ===== GET USER ROLE =====
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserRole(user.role);
      } catch (e) {
        console.error('Failed to parse user from localStorage', e);
      }
    }
  }, []);

  // ===== PROVIDER: Load Job Offers =====
  const loadProviderOffers = useCallback(async () => {
    try {
      const response = await api.get('/jobs/offers');
      const data = response.data;
      const offersList = Array.isArray(data) ? data : data?.jobs || data?.data?.jobs || data?.data || [];
      setProviderOffers(offersList);
    } catch (err) {
      console.error('Failed to load job offers:', err);
      const message = err.response?.data?.message || err.message || 'Failed to load job offers';
      if (err.response?.status !== 404) toast.error(message);
    }
  }, []);

  // ===== PROVIDER: Load My Applications =====
  const loadProviderApplications = useCallback(async () => {
    try {
      const response = await api.get('/jobs/my-applications');
      const data = response.data;
      const appsList = Array.isArray(data) ? data : data?.jobs || data?.data?.jobs || data?.data || [];
      setProviderApplications(appsList);
    } catch (err) {
      console.error('Failed to load applications:', err);
      const message = err.response?.data?.message || err.message || 'Failed to load applications';
      if (err.response?.status !== 404) toast.error(message);
    }
  }, []);

  // ===== CLIENT: Load My Posted Jobs =====
  const loadClientJobs = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await api.get('/jobs/my', { params });
      const data = response.data;
      const jobsList = Array.isArray(data) ? data : data?.jobs || data?.data?.jobs || data?.data || [];
      // Filter to show only jobs with activity
      const relevantJobs = jobsList.filter(job => {
        const hasApplications = job.applications?.length > 0;
        const isPendingOffer = job.status === 'pending_provider_acceptance';
        return hasApplications || isPendingOffer || job.status === 'open';
      });
      setClientJobs(relevantJobs);
    } catch (err) {
      console.error('Failed to load client jobs:', err);
      const message = err.response?.data?.message || err.message || 'Failed to load your posted jobs';
      if (err.response?.status !== 404) toast.error(message);
    }
  }, [statusFilter]);

  // ===== LOAD DATA ON MOUNT / TAB CHANGE =====
  useEffect(() => {
    if (userRole === 'provider') {
      setProviderLoading(true);
      if (providerActiveTab === 'offers') {
        loadProviderOffers();
      } else {
        loadProviderApplications();
      }
      setProviderLoading(false);
    } else if (userRole === 'customer') {
      setClientLoading(true);
      loadClientJobs();
      setClientLoading(false);
    }
  }, [userRole, providerActiveTab, loadProviderOffers, loadProviderApplications, loadClientJobs]);

  // ===== PROVIDER ACTIONS =====
  const handleAccept = async (jobId) => {
    setAcceptingId(jobId);
    try {
      const response = await api.patch(`/jobs/${jobId}/respond`, { action: 'accept' });
      setProviderOffers((prev) => prev.filter((job) => job._id !== jobId));
      toast.success(response.data?.message || 'Job accepted! Work can now begin.');
    } catch (err) {
      console.error('Accept failed:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to accept job');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleDecline = async (jobId) => {
    setDecliningId(jobId);
    try {
      const response = await api.patch(`/jobs/${jobId}/respond`, { action: 'decline' });
      setProviderOffers((prev) => prev.filter((job) => job._id !== jobId));
      toast.info(response.data?.message || 'Job offer declined.');
    } catch (err) {
      console.error('Decline failed:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to decline job');
    } finally {
      setDecliningId(null);
      setDeclineJobId(null);
    }
  };

  // ===== CLIENT ACTIONS =====
  const handleCloseJob = async (jobId) => {
    setClosingId(jobId);
    try {
      await api.patch(`/jobs/${jobId}/cancel`, { reason: 'Closed by client' });
      setClientJobs((prev) => prev.map(job => job._id === jobId ? { ...job, status: 'cancelled' } : job));
      toast.success('Job closed successfully');
    } catch (err) {
      console.error('Close job failed:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to close job');
    } finally {
      setClosingId(null);
    }
  };

  const handleViewApplicants = (jobId) => {
    toast.info(`Viewing applicants for job #${jobId}`);
  };

  const handleEditJob = (jobId) => {
    toast.info(`Editing job #${jobId}`);
  };

  // ===== FILTERING =====
  const filterJobs = (jobs) => {
    return jobs.filter((job) => {
      const urgencyMatch = urgencyFilter === 'all' || job.urgency === urgencyFilter;
      const budgetMatch = budgetFilter === 0 || job.budget >= budgetFilter;
      const statusMatch = !statusFilter || statusFilter === 'all' || job.status === statusFilter;
      return urgencyMatch && budgetMatch && statusMatch;
    });
  };

  // ===== RENDER =====
  if (!userRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-foreground/40" />
          <p className="text-foreground/60">Loading...</p>
        </div>
      </div>
    );
  }

  // ===== PROVIDER VIEW =====
  if (userRole === 'provider') {
    const currentList = providerActiveTab === 'offers' ? filterJobs(providerOffers) : filterJobs(providerApplications);
    const currentLoading = providerLoading;
    const currentError = providerError;
    const totalCount = providerActiveTab === 'offers' ? providerOffers.length : providerApplications.length;
    const filteredCount = currentList.length;

    if (currentLoading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-foreground/40" />
            <p className="text-foreground/60">Loading {providerActiveTab === 'offers' ? 'job offers' : 'your applications'}...</p>
          </div>
        </div>
      );
    }

    if (currentError && currentList.length === 0) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="p-6 max-w-md w-full text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading</h3>
            <p className="text-foreground/60 mb-4">{currentError}</p>
            <Button onClick={providerActiveTab === 'offers' ? loadProviderOffers : loadProviderApplications}>Try Again</Button>
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
              <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">
                    {providerActiveTab === 'offers' ? 'Job Offers' : 'My Applications'}
                  </h1>
                  <p className="text-sm text-foreground/60 mt-1">
                    {providerActiveTab === 'offers'
                      ? `${filteredCount} offer${filteredCount === 1 ? '' : 's'} awaiting your response`
                      : `${filteredCount} application${filteredCount === 1 ? '' : 's'} you've submitted`}
                    {totalCount !== filteredCount && ` (filtered from ${totalCount})`}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {/* Tabs */}
                  <div className="flex gap-1 border border-border rounded-lg p-1">
                    <button 
                      onClick={() => setProviderActiveTab('offers')} 
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1 ${
                        providerActiveTab === 'offers' ? 'bg-blue-100 text-blue-600' : 'text-foreground/60 hover:text-foreground'
                      }`}
                    >
                      <Briefcase className="w-4 h-4" />
                      Job Offers ({providerOffers.length})
                    </button>
                    <button 
                      onClick={() => setProviderActiveTab('applications')} 
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1 ${
                        providerActiveTab === 'applications' ? 'bg-blue-100 text-blue-600' : 'text-foreground/60 hover:text-foreground'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                      My Applications ({providerApplications.length})
                    </button>
                  </div>
                  {/* Layout Toggle */}
                  <div className="flex gap-1 border border-border rounded-lg p-1">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-foreground/60 hover:text-foreground'}`} title="Grid view"><LayoutGrid className="w-5 h-5" /></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-foreground/60 hover:text-foreground'}`} title="List view"><List className="w-5 h-5" /></button>
                  </div>
                </div>
              </div>
              {/* Filter Bar */}
              <div className="flex gap-4 flex-wrap items-end">
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
                    <option value="1000">Rs. 1,000+</option>
                    <option value="2000">Rs. 2,000+</option>
                    <option value="5000">Rs. 5,000+</option>
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <Button variant="outline" size="sm" onClick={providerActiveTab === 'offers' ? loadProviderOffers : loadProviderApplications} disabled={currentLoading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${currentLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {filteredCount > 0 ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : ''}>
                {currentList.map((job) => (
                  providerActiveTab === 'offers' ? (
                    <ProviderOfferCard 
                      key={job._id} 
                      job={job} 
                      viewMode={viewMode} 
                      onAccept={handleAccept} 
                      onDecline={() => setDeclineJobId(job._id)} 
                      acceptingId={acceptingId} 
                      decliningId={decliningId} 
                    />
                  ) : (
                    <ProviderApplicationCard key={job._id} job={job} viewMode={viewMode} />
                  )
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                {providerActiveTab === 'offers' ? (
                  <>
                    <Clock className="w-16 h-16 text-foreground/20 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">No Pending Offers</h3>
                    <p className="text-foreground/60 max-w-md mx-auto">
                      {providerOffers.length === 0 
                        ? "You don't have any job offers awaiting your response. Keep your profile updated!" 
                        : 'No offers match your current filters.'}
                    </p>
                    {providerOffers.length === 0 && (
                      <Button variant="outline" className="mt-4" onClick={() => toast.info('Browse open jobs to apply')}>
                        Browse Open Jobs <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Send className="w-16 h-16 text-foreground/20 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">No Applications Yet</h3>
                    <p className="text-foreground/60 max-w-md mx-auto mb-4">
                      {providerApplications.length === 0 
                        ? "You haven't applied to any jobs yet." 
                        : 'No applications match your current filters.'}
                    </p>
                    {providerApplications.length === 0 && (
                      <Button onClick={() => toast.info('Browse open jobs to apply')}>
                        Find Jobs to Apply
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Decline Confirmation */}
        <AlertDialog open={declineJobId !== null} onOpenChange={(open) => !open && setDeclineJobId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Decline Job Offer?</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to decline this job offer? This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => declineJobId && handleDecline(declineJobId)} className="bg-red-600 hover:bg-red-700">Decline Offer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // ===== CLIENT VIEW =====
  if (userRole === 'customer') {
    const filteredJobs = filterJobs(clientJobs);
    const filteredCount = filteredJobs.length;
    const totalCount = clientJobs.length;

    if (clientLoading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-foreground/40" />
            <p className="text-foreground/60">Loading your posted jobs...</p>
          </div>
        </div>
      );
    }

    if (clientError && filteredJobs.length === 0) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="p-6 max-w-md w-full text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Jobs</h3>
            <p className="text-foreground/60 mb-4">{clientError}</p>
            <Button onClick={loadClientJobs}>Try Again</Button>
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
              <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">My Posted Jobs</h1>
                  <p className="text-sm text-foreground/60 mt-1">
                    {filteredCount} job{filteredCount === 1 ? '' : 's'} with activity
                    {totalCount !== filteredCount && ` (filtered from ${totalCount})`}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {/* Layout Toggle */}
                  <div className="flex gap-1 border border-border rounded-lg p-1">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded transition-colors ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-foreground/60 hover:text-foreground'}`} title="Grid view"><LayoutGrid className="w-5 h-5" /></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-foreground/60 hover:text-foreground'}`} title="List view"><List className="w-5 h-5" /></button>
                  </div>
                </div>
              </div>
              {/* Filter Bar */}
              <div className="flex gap-4 flex-wrap items-end">
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
                    <option value="1000">Rs. 1,000+</option>
                    <option value="2000">Rs. 2,000+</option>
                    <option value="5000">Rs. 5,000+</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground/60 block mb-1">Status</label>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="pending_provider_acceptance">Pending</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <Button variant="outline" size="sm" onClick={loadClientJobs} disabled={clientLoading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${clientLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {filteredCount > 0 ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : ''}>
                {filteredJobs.map((job) => (
                  <ClientJobCard 
                    key={job._id} 
                    job={job} 
                    viewMode={viewMode} 
                    onViewApplicants={handleViewApplicants}
                    onEdit={handleEditJob}
                    onClose={handleCloseJob}
                    closingId={closingId}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <LayoutGrid className="w-16 h-16 text-foreground/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No Active Job Postings</h3>
                <p className="text-foreground/60 max-w-md mx-auto mb-4">
                  {clientJobs.length === 0 
                    ? "You haven't posted any jobs yet, or none have received applications." 
                    : 'No jobs match your current filters.'}
                </p>
                {clientJobs.length === 0 && (
                  <Button onClick={() => toast.info('Navigate to Post Job page')}>
                    Post a New Job
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Close Job Confirmation */}
        <AlertDialog open={closingId !== null} onOpenChange={(open) => !open && setClosingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Close This Job Posting?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to close this job posting? 
                {filteredJobs.find(j => j._id === closingId)?.applications?.length > 0 
                  ? ' Existing applications will remain visible, but no new providers can apply.' 
                  : ' No new providers will be able to accept it.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => closingId && handleCloseJob(closingId)} className="bg-red-600 hover:bg-red-700">Close Job</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // ===== FALLBACK =====
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="p-6 max-w-md w-full text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Access Denied</h3>
        <p className="text-foreground/60 mb-4">Please log in to view job offers.</p>
        <Button onClick={() => window.location.href = '/login'}>Go to Login</Button>
      </Card>
    </div>
  );
}