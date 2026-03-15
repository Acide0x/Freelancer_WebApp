// src/pages/JobDetailPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Star, MapPin, Clock, DollarSign, User, AlertCircle, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import api from '@/api/api';

// Helpers
const formatUrgency = (urgency) => ({
    low: { label: 'Low Priority', class: 'bg-gray-100 text-gray-700 border-gray-300' },
    medium: { label: 'Medium Priority', class: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    high: { label: 'High Priority', class: 'bg-orange-100 text-orange-700 border-orange-300' },
}[urgency] || { label: 'Medium Priority', class: 'bg-yellow-100 text-yellow-700 border-yellow-300' });

const formatBudgetHint = (budget, category) => {
    const mult = { Carpentry: 0.8, Plumbing: 0.75, Electrical: 0.85 }[category] || 0.8;
    return { min: Math.round(budget * mult), max: Math.round(budget * 1.2) };
};

const getCachedUser = () => {
    try {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    } catch { return null; }
};

export default function JobDetailPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const currentUser = getCachedUser();

    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [redirecting, setRedirecting] = useState(false);
    const [proposedPrice, setProposedPrice] = useState('');
    const [coverMessage, setCoverMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasApplied, setHasApplied] = useState(false);

    // ⚡ Validate id and redirect if invalid — inside useEffect (React-compliant)
    useEffect(() => {
        if (!id || id === 'undefined' || id === 'null') {
            setRedirecting(true);
            // Small delay to prevent flash, then redirect
            const timer = setTimeout(() => {
                navigate('/jobs', { replace: true });
                toast.error('Invalid job link');
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [id, navigate]);

    // Fetch job only if id is valid and not redirecting
    useEffect(() => {
        if (!id || id === 'undefined' || id === 'null' || redirecting) return;

        const fetchJob = async () => {
            try {
                const response = await api.get(`/jobs/${id}`);
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
                console.error('Fetch error:', err);
                const msg = err.response?.data?.message || 'Failed to load job';
                toast.error(msg);
                if (err.response?.status === 404) {
                    setTimeout(() => navigate('/jobs', { replace: true }), 1200);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchJob();
    }, [id, currentUser, navigate, redirecting]);

    // Handle application
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!proposedPrice || !coverMessage.trim()) return toast.error('Fill all fields');

        const price = parseFloat(proposedPrice);
        const hint = formatBudgetHint(job.budget, job.category);
        if (price < hint.min || price > hint.max) {
            return toast.error(`Price must be Rs. ${hint.min}-${hint.max}`);
        }

        setIsSubmitting(true);
        try {
            const response = await api.post(`/jobs/${id}/apply`, {
                proposedPrice: price,
                message: coverMessage.trim()
            });

            setHasApplied(true);
            toast.success(response.data?.message || 'Application submitted!');
            setProposedPrice('');
            setCoverMessage('');

            const refreshRes = await api.get(`/jobs/${id}`);
            const refreshData = refreshRes.data;
            setJob(refreshData?.job || refreshData?.data?.job || refreshData?.data);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Apply failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Show minimal loading while checking id or fetching
    if (loading || redirecting) {
        return (
            <main className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </main>
        );
    }

    // If no job after loading
    if (!job) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="p-8 text-center max-w-md">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Job Not Found</h2>
                    <p className="text-gray-600 mb-6">This job may have been removed.</p>
                    <Button onClick={() => navigate('/jobs')}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Browse Jobs
                    </Button>
                </Card>
            </div>
        );
    }

    // Prepare data
    const urgency = formatUrgency(job.urgency);
    const budgetHint = formatBudgetHint(job.budget, job.category);
    const isClient = currentUser?.role === 'customer' && job.client?._id === currentUser._id;
    const isProvider = currentUser?.role === 'provider';
    const canApply = isProvider && !isClient && !hasApplied && job.status === 'open';
    const isClosed = !['open', 'pending_provider_acceptance'].includes(job.status);

    return (
        <>
            <Toaster />
            <main className="min-h-screen bg-background">
                {/* Header */}
                <div className="border-b bg-card sticky top-0 z-20">
                    <div className="max-w-6xl mx-auto px-4 py-4">
                        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                            <ArrowLeft className="w-4 h-4" /> Back to Jobs
                        </button>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT: Job Details */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Header Card */}
                        <Card className="p-6">
                            <div className="flex justify-between items-start gap-4 mb-4">
                                <div>
                                    <h1 className="text-2xl font-bold">{job.title}</h1>
                                    <p className="text-sm text-gray-500">
                                        Posted {new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-sm border ${urgency.class}`}>
                                    {urgency.label}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t">
                                <div>
                                    <p className="text-xs text-gray-500">BUDGET</p>
                                    <p className="font-bold">Rs. {job.budget?.toLocaleString()}</p>
                                    <p className="text-xs text-gray-400">~Rs. {budgetHint.min}-Rs. {budgetHint.max}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">DURATION</p>
                                    <p className="font-bold">
                                        {job.estimatedDuration?.value ? `${job.estimatedDuration.value} ${job.estimatedDuration.unit}` : 'Flexible'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">CATEGORY</p>
                                    <p className="font-bold">{job.category}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">STATUS</p>
                                    <p className={`font-bold ${job.status === 'open' ? 'text-green-600' : ''}`}>
                                        {job.status.replace('_', ' ').toUpperCase()}
                                    </p>
                                </div>
                            </div>
                        </Card>

                        {/* Location */}
                        <Card className="p-6">
                            <h3 className="font-semibold mb-3">Location</h3>
                            <p className="flex items-start gap-2 text-gray-700">
                                <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <span>
                                    {job.location?.address || 'Address not provided'}
                                    {job.location?.city && <span className="text-gray-500">, {job.location.city}</span>}
                                </span>
                            </p>
                            {job.preferredDate && (
                                <p className="flex items-center gap-2 text-gray-700 mt-3">
                                    <Clock className="w-4 h-4 text-blue-600" />
                                    Preferred: {new Date(job.preferredDate).toLocaleDateString()}
                                </p>
                            )}
                        </Card>

                        {/* Description */}
                        <Card className="p-6">
                            <h3 className="font-semibold mb-3">Description</h3>
                            <p className="whitespace-pre-line text-gray-700 leading-relaxed">{job.description}</p>
                        </Card>

                        {/* Category */}
                        <Card className="p-6">
                            <h3 className="font-semibold mb-3">Category</h3>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm border border-blue-200">
                                    {job.category}
                                </span>
                            </div>
                        </Card>

                        {/* Client Info */}
                        {job.client && (
                            <Card className="p-6">
                                <h3 className="font-semibold mb-4">Posted by</h3>
                                <div className="flex items-start gap-4">
                                    <img
                                        src={job.client.avatar?.trim() || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                                        alt={job.client.fullName}
                                        className="w-14 h-14 rounded-full bg-gray-100"
                                        onError={(e) => { e.target.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'; }}
                                    />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold">{job.client.fullName}</p>
                                            {job.client.isVerified && (
                                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" /> Verified
                                                </span>
                                            )}
                                        </div>
                                        {job.client.ratings?.count > 0 && (
                                            <div className="flex items-center gap-1 mt-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} className={`w-4 h-4 ${i < Math.floor(job.client.ratings.average) ? 'text-yellow-500 fill-yellow-500' : i < job.client.ratings.average ? 'text-yellow-300 fill-yellow-300' : 'text-gray-300'}`} />
                                                ))}
                                                <span className="text-sm text-gray-600 ml-1">{job.client.ratings.average?.toFixed(1)} ({job.client.ratings.count})</span>
                                            </div>
                                        )}
                                        <p className="text-sm text-gray-500 mt-1">
                                            Member since {new Date(job.client.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* RIGHT: Action Panel */}
                    <div className="lg:col-span-1">
                        {hasApplied ? (
                            <Card className="p-6 bg-green-50 border-green-200 sticky top-24">
                                <div className="text-center">
                                    <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-green-900">Application Sent!</h3>
                                    <p className="text-sm text-green-800 mt-2">The client will review your proposal.</p>
                                </div>
                            </Card>
                        ) : canApply ? (
                            <Card className="p-6 sticky top-24">
                                <h3 className="font-bold text-lg mb-4">Submit Proposal</h3>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium block mb-1">Your Price</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
                                                Rs.
                                            </span>
                                            <Input
                                                type="number"
                                                value={proposedPrice}
                                                onChange={(e) => setProposedPrice(e.target.value)}
                                                className="pl-9"
                                                placeholder={`${budgetHint.min}-${budgetHint.max}`}
                                                min={budgetHint.min}
                                                max={budgetHint.max}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Suggested: Rs. {budgetHint.min.toLocaleString()} - Rs. {budgetHint.max.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium block mb-1">Message</label>
                                        <textarea value={coverMessage} onChange={(e) => setCoverMessage(e.target.value)} rows={4} maxLength={500} className="w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Why are you a good fit?" />
                                        <p className="text-xs text-gray-500 text-right mt-1">{coverMessage.length}/500</p>
                                    </div>
                                    <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-blue-800">Include relevant experience and timeline.</p>
                                    </div>
                                    <Button type="submit" disabled={isSubmitting || !proposedPrice || !coverMessage.trim()} className="w-full">
                                        {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : 'Submit Proposal'}
                                    </Button>
                                    <Button type="button" variant="outline" className="w-full" onClick={() => toast.info('Saved!')}>Save Job</Button>
                                </form>
                                {job.applications?.length > 0 && <p className="text-xs text-gray-500 text-center mt-4">{job.applications.length} proposal{job.applications.length !== 1 ? 's' : ''} received</p>}
                            </Card>
                        ) : (
                            <Card className="p-6 sticky top-24 text-center">
                                {isClosed ? (
                                    <><AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" /><p className="font-medium mb-1">Job No Longer Open</p><p className="text-sm text-gray-600">This job is {job.status.replace('_', ' ')}.</p></>
                                ) : isClient ? (
                                    <><User className="w-12 h-12 text-gray-400 mx-auto mb-3" /><p className="font-medium mb-2">This is your job</p><Button variant="outline" onClick={() => navigate(`/dashboard/jobs/${job._id}`)}>Manage Job</Button></>
                                ) : !currentUser ? (
                                    <><User className="w-12 h-12 text-gray-400 mx-auto mb-3" /><p className="font-medium mb-2">Log in to apply</p><Button onClick={() => navigate('/login', { state: { from: `/jobs/${id}` } })}>Log In</Button></>
                                ) : currentUser.role !== 'provider' ? (
                                    <><AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" /><p className="font-medium">Providers Only</p><p className="text-sm text-gray-600">Only service providers can apply.</p></>
                                ) : null}
                            </Card>
                        )}
                    </div>

                </div>
            </main>
        </>
    );
}