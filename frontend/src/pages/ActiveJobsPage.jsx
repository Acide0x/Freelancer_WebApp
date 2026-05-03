// src/pages/ActiveJobsPage.jsx - FIXED
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Send, Menu, X, Copy, Trash2, CheckCheck, Check, DollarSign, Clock, RefreshCw, AlertCircle, Loader2, User as UserIcon } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import api from '../api/api'

// ============================================================================
// ⚡ ID EXTRACTION HELPER (handles MongoDB $oid format)
// ============================================================================
const extractId = (val) => {
  if (!val) return null
  if (typeof val === 'string') return val
  if (val.$oid) return val.$oid
  if (val._id) return extractId(val._id)
  if (val.id) return val.id
  return null
}

// ============================================================================
// ⚡ SIMPLE MODULE-LEVEL CACHING
// ============================================================================
let authCache = null

const USER_CACHE_KEY = 'dreel_user_cache_v1'
const CACHE_TTL = 1000 * 60 * 30

const getUserCache = () => {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    const now = Date.now()
    const valid = {}
    for (const [id, entry] of Object.entries(parsed)) {
      if (now - entry.timestamp < CACHE_TTL) valid[id] = entry.data
    }
    return valid
  } catch { return {} }
}
const saveUserCache = (cache) => {
  try {
    const withTimestamp = {}
    for (const [id, data] of Object.entries(cache)) {
      withTimestamp[id] = { data, timestamp: Date.now() }
    }
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(withTimestamp))
  } catch (e) { console.warn('Cache save error:', e) }
}
let userCache = getUserCache()

// ============================================================================
// 🔄 PARALLEL USER FETCH
// ============================================================================
const fetchUsersInParallel = async (userIds) => {
  const uncachedIds = [...new Set(userIds.filter(id => id && !userCache[id]))]
  if (uncachedIds.length === 0) return userIds.map(id => userCache[id] || null)

  const fetchPromises = uncachedIds.map(async (id) => {
    try {
      const { data } = await api.get(`/users/providers/${id}`, { timeout: 3000 })
      const user = data?.data?.provider || data?.user
      if (user) {
        const normalized = { ...user, _id: extractId(user._id) || extractId(user.id) }
        userCache[id] = normalized
        return normalized
      }
      return null
    } catch { return null }
  })

  const results = await Promise.allSettled(fetchPromises)
  saveUserCache(userCache)
  return userIds.map(id => {
    if (userCache[id]) return userCache[id]
    const idx = uncachedIds.indexOf(id)
    return idx !== -1 && results[idx].status === 'fulfilled' ? results[idx].value : null
  })
}

// ============================================================================
// 📦 JOB PREPARATION (with $oid handling)
// ============================================================================
const prepareJobForDisplay = (job) => {
  const userIdsToFetch = []
  const jobId = extractId(job._id) || extractId(job.id)
  const clientId = extractId(job.client)
  const workerId = extractId(job.assignedWorker)

  const normalized = {
    ...job,
    _id: jobId,
    displayStatus: job.status === 'in_progress' ? 'Active' : job.status === 'escrow_funded' ? 'Funded' : job.status,
    _clientRef: clientId,
    _workerRef: workerId,
    client: typeof job.client === 'object' && !job.client?.$oid ? job.client : userCache[clientId] || null,
    assignedWorker: typeof job.assignedWorker === 'object' && !job.assignedWorker?.$oid ? job.assignedWorker : userCache[workerId] || null,
  }

  if (clientId && !userCache[clientId]) userIdsToFetch.push(clientId)
  if (workerId && !userCache[workerId]) userIdsToFetch.push(workerId)

  return { job: normalized, userIdsToFetch }
}

const hydrateJobWithUsers = (job, fetchedUsers) => {
  if (!fetchedUsers?.length) return job
  const hydrated = { ...job }
  if (job._clientRef && !job.client) {
    const client = fetchedUsers.find(u => extractId(u?._id) === job._clientRef || extractId(u?.id) === job._clientRef)
    if (client) hydrated.client = client
  }
  if (job._workerRef && !job.assignedWorker) {
    const worker = fetchedUsers.find(u => extractId(u?._id) === job._workerRef || extractId(u?.id) === job._workerRef)
    if (worker) hydrated.assignedWorker = worker
  }
  return hydrated
}

// ============================================================================
// 🎯 MAIN COMPONENT
// ============================================================================
export default function ActiveJobsPage() {
  const navigate = useNavigate()
  const { jobId: paramJobId } = useParams()

  const [selectedJobId, setSelectedJobId] = useState(paramJobId || null)
  const [messageInputs, setMessageInputs] = useState({})
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editingText, setEditingText] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [showChatOnMobile, setShowChatOnMobile] = useState(false)
  const [hoveredMessageId, setHoveredMessageId] = useState(null)
  const [isSending, setIsSending] = useState(false)

  const [currentUser, setCurrentUser] = useState(null)
  const [activeJobs, setActiveJobs] = useState([])
  const [messages, setMessages] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const scrollRef = useRef(null)
  const isMounted = useRef(true)

  const selectedJob = useMemo(() => activeJobs.find(job => job._id === selectedJobId), [activeJobs, selectedJobId])
  const conversationId = selectedJob?._id
  const currentMessages = conversationId ? (messages[conversationId] || []) : []

  const getOtherUserFromJob = useCallback((job) => {
    if (!job || !currentUser) return null
    const currentUserId = extractId(currentUser._id) || extractId(currentUser.id)
    const workerId = extractId(job.assignedWorker?._id) || extractId(job.assignedWorker?.id)
    if (job.assignedWorker && job.client) {
      return workerId === currentUserId ? { ...job.client, role: 'client' } : { ...job.assignedWorker, role: 'provider' }
    }
    return job.client ? { ...job.client, role: 'client' } : null
  }, [currentUser])

  // ============================================================================
  // 🔐 AUTH + FETCH JOBS — single effect, reads localStorage directly
  // No profile API call needed: token+user already in localStorage from login.
  // Server rejects invalid tokens with 401 which we handle below.
  // ============================================================================
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      // Step 1: read user from localStorage — no API call needed
      const token      = localStorage.getItem('token')
      const storedUser = localStorage.getItem('user')

      if (!token || !storedUser) {
        navigate('/login', { replace: true, state: { from: '/jobs/active' } })
        return
      }

      let user
      try {
        user = JSON.parse(storedUser)
      } catch {
        navigate('/login', { replace: true, state: { from: '/jobs/active' } })
        return
      }

      // Normalise: login stores .id, we need ._id everywhere
      const uid = user._id || user.id
      if (!uid) {
        navigate('/login', { replace: true, state: { from: '/jobs/active' } })
        return
      }
      user = { ...user, _id: uid }

      if (!cancelled && isMounted.current) {
        setCurrentUser(user)
        setIsLoading(false)
      }

      // Step 2: fetch jobs
      const role       = user.role
      const isClient   = ['customer', 'client', 'individual', 'shelter'].includes(role)
      const isProvider = ['provider', 'freelancer'].includes(role)

      const endpoint = isClient ? '/jobs/my' : isProvider ? '/jobs/assigned' : null
      if (!endpoint) {
        console.warn('[ActiveJobs] unknown role:', role)
        return
      }

      try {
        const { data } = await api.get(endpoint, {
          params:  { status: ['in_progress', 'escrow_funded'] },
          timeout: 8000,
        })
        if (cancelled || !isMounted.current) return

        console.log('[ActiveJobs] API response:', data)

        const rawJobs = data.jobs
          || data.data?.jobs
          || (Array.isArray(data.data) ? data.data : null)
          || (Array.isArray(data)      ? data      : [])

        console.log('[ActiveJobs] rawJobs count:', rawJobs.length)

        const filteredJobs = rawJobs.filter(job =>
          (job.status === 'in_progress' || job.status === 'escrow_funded') && job.isDeleted !== true
        )

        console.log('[ActiveJobs] after filter:', filteredJobs.length)

        const prepared   = filteredJobs.map(prepareJobForDisplay)
        const initialJobs = prepared.map(p => p.job)
        const allUserIds  = [...new Set(prepared.flatMap(p => p.userIdsToFetch))]

        if (!cancelled && isMounted.current) setActiveJobs(initialJobs)

        if (allUserIds.length > 0) {
          const fetchedUsers = await fetchUsersInParallel(allUserIds)
          if (!cancelled && isMounted.current) {
            setActiveJobs(initialJobs.map(job => {
              const prep = prepared.find(p => p.job._id === job._id)
              return prep ? hydrateJobWithUsers(job, fetchedUsers) : job
            }))
          }
        }

      } catch (err) {
        if (cancelled || !isMounted.current) return
        console.error('[ActiveJobs] fetch error:', err)
        if (err.response?.status === 401) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          toast.error('Session expired — please log in again')
          navigate('/login', { replace: true, state: { from: '/jobs/active' } })
        }
      }
    }

    init()
    return () => { cancelled = true }
  }, [navigate])

  // ============================================================================
  // 💬 FETCH MESSAGES
  // FIX (Bug 2): api calls return { data }, not { convData } / { msgData }.
  // The old destructure `const { convData } = await api.post(...)` always yielded
  // undefined, causing convData.data to throw and silently swallow the error.
  // ============================================================================
  useEffect(() => {
    const userId = currentUser?._id || currentUser?.id
    if (!selectedJobId || !userId || !currentUser) return

    let cancelled = false

    const fetchMessages = async () => {
      try {
        // FIX: destructure as `data` then alias
        const { data: convData } = await api.post(`/chat/conversations/job/${selectedJobId}`, {}, { timeout: 5000 })
        const conversation = convData.data?.conversation || convData.conversation
        if (!conversation?._id) return

        const { data: msgData } = await api.get(`/chat/conversations/${conversation._id}/messages`, { timeout: 5000 })
        if (!cancelled && isMounted.current) {
          setMessages(prev => ({ ...prev, [selectedJobId]: msgData.data?.messages || [] }))
        }
      } catch (err) {
        if (err.response?.status === 404 && !cancelled && isMounted.current) {
          setMessages(prev => ({ ...prev, [selectedJobId]: [] }))
          return
        }
        console.error('Messages error:', err)
      }
    }

    fetchMessages()
    return () => { cancelled = true }
  }, [selectedJobId, currentUser])

  // URL sync
  useEffect(() => {
    if (paramJobId && paramJobId !== selectedJobId) setSelectedJobId(paramJobId)
  }, [paramJobId])

  useEffect(() => {
    if (selectedJobId) {
      navigate(`/jobs/active/${selectedJobId}`, { replace: true })
    } else {
      navigate('/jobs/active', { replace: true })
    }
  }, [selectedJobId, navigate])

  // Single dedicated teardown — the only place isMounted.current is set to false
  useEffect(() => { return () => { isMounted.current = false } }, [])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current && currentMessages.length > 0) {
      const timer = setTimeout(() => {
        if (scrollRef.current && isMounted.current) {
          scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [currentMessages])

  // ============================================================================
  // 💬 HANDLERS
  // ============================================================================
  const handleSendMessage = useCallback(async (jobId) => {
    const content = messageInputs[jobId]?.trim()
    const userId = extractId(currentUser?._id) || extractId(currentUser?.id)
    if (!content || !userId || isSending) return
    try {
      setIsSending(true)
      // FIX: same destructure fix applied here for consistency
      const { data: convData } = await api.post(`/chat/conversations/job/${jobId}`, {}, { timeout: 5000 })
      const conversationId = extractId(convData.data?.conversation?._id) || extractId(convData.conversation?._id)
      if (!conversationId) throw new Error('Could not create conversation')
      const { data: msgData } = await api.post(
        `/chat/conversations/${conversationId}/messages`,
        { content, attachments: [], replyTo: extractId(replyingTo?._id) || extractId(replyingTo?.id) },
        { timeout: 5000 }
      )
      const newMessage = msgData.data?.message || msgData.message
      if (newMessage && isMounted.current) {
        setMessages(prev => ({ ...prev, [jobId]: [...(prev[jobId] || []), newMessage] }))
        setMessageInputs(prev => ({ ...prev, [jobId]: '' }))
        setReplyingTo(null)
        toast.success('Message sent', { duration: 2000 })
      }
    } catch (err) {
      console.error('Send error:', err)
      toast.error(err.response?.data?.message || 'Failed to send')
    } finally {
      if (isMounted.current) setIsSending(false)
    }
  }, [messageInputs, currentUser, isSending, replyingTo])

  const handleEditMessage = useCallback(async (messageId) => {
    if (!editingText.trim() || !currentUser) return
    try {
      setIsSending(true)
      const { data } = await api.put(`/chat/messages/${messageId}`, { content: editingText.trim() }, { timeout: 5000 })
      const updated = data.data?.message || data.message
      if (updated && isMounted.current) {
        setMessages(prev => {
          const updatedMessages = { ...prev }
          for (const [convId, msgs] of Object.entries(prev)) {
            updatedMessages[convId] = msgs.map(m =>
              extractId(m._id) === messageId || extractId(m.id) === messageId ? updated : m
            )
          }
          return updatedMessages
        })
        toast.success('Message updated')
      }
      setEditingMessageId(null)
      setEditingText('')
    } catch (err) {
      console.error('Edit error:', err)
      toast.error('Failed to update')
    } finally {
      if (isMounted.current) setIsSending(false)
    }
  }, [editingText, currentUser])

  const handleDeleteMessage = useCallback(async (messageId) => {
    if (!window.confirm('Delete this message?')) return
    try {
      await api.delete(`/chat/messages/${messageId}`, { timeout: 3000 })
      setMessages(prev => {
        const updated = { ...prev }
        for (const [convId, msgs] of Object.entries(prev)) {
          updated[convId] = msgs.map(m =>
            (extractId(m._id) === messageId || extractId(m.id) === messageId)
              ? { ...m, deletedAt: new Date().toISOString(), content: '[deleted]' }
              : m
          )
        }
        return updated
      })
      toast.success('Message deleted')
    } catch (err) {
      console.error('Delete error:', err)
      toast.error('Failed to delete')
    }
  }, [])

  const handleKeyPress = useCallback((e, jobId) => {
    if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handleSendMessage(jobId) }
  }, [handleSendMessage])

  const handleSelectJob  = useCallback((jobId) => { setSelectedJobId(jobId); setShowChatOnMobile(false) }, [])
  const handleCloseChat  = useCallback(() => { setSelectedJobId(null); setShowChatOnMobile(false); navigate('/jobs/active') }, [navigate])
  const handleRetry      = useCallback(() => { authCache = null; setError(null); setIsLoading(true); setCurrentUser(null); window.location.reload() }, [])
  const handleLogout     = useCallback(() => { localStorage.removeItem('token'); authCache = null; navigate('/login', { replace: true, state: { from: '/jobs/active' } }) }, [navigate])

  // ============================================================================
  // 🎨 RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (error && !currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/')}>Go Home</Button>
            <Button onClick={handleRetry}><RefreshCw className="w-4 h-4 mr-2" /> Retry</Button>
          </div>
        </Card>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Login Required</h2>
          <p className="text-muted-foreground mb-6">Please log in to continue</p>
          <Button onClick={() => navigate('/login', { state: { from: '/jobs/active' } })}>Go to Login</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Dreelancing</h1>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {['provider', 'freelancer'].includes(currentUser?.role) ? 'Provider' : 'Client'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {selectedJobId && (
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setShowChatOnMobile(!showChatOnMobile)}>
                {showChatOnMobile ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            )}
            <Avatar className="h-8 w-8 cursor-pointer" onClick={handleLogout}>
              <AvatarImage src={currentUser?.avatar || currentUser?.profilePicture} alt={currentUser?.fullName} />
              <AvatarFallback className="bg-primary/10">
                {currentUser?.fullName?.split(' ')?.map(n => n?.[0])?.join('')?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-120px)]">

          {/* Jobs List */}
          <div className={`md:col-span-1 flex flex-col ${showChatOnMobile && selectedJobId ? 'hidden md:flex' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Active Jobs</h2>
            </div>
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-3">
                {activeJobs.length === 0 ? (
                  <Card className="p-6 text-center">
                    <p className="text-muted-foreground mb-4">
                      {['customer', 'client', 'individual', 'shelter'].includes(currentUser?.role)
                        ? "You don't have any active jobs yet."
                        : "You don't have any active assignments yet."}
                    </p>
                    {['customer', 'client', 'individual', 'shelter'].includes(currentUser?.role)
                      ? <Button onClick={() => navigate('/jobs/post')} size="sm">Post a Job</Button>
                      : <Button onClick={() => navigate('/jobs')} size="sm">Browse Jobs</Button>}
                  </Card>
                ) : activeJobs.map((job) => {
                  const otherUser  = getOtherUserFromJob(job)
                  const roleLabel  = otherUser?.role === 'provider' ? 'Provider' : 'Client'
                  const isSelected = selectedJobId === job._id
                  return (
                    <Card
                      key={job._id}
                      className={`p-4 cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                      onClick={() => handleSelectJob(job._id)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-sm line-clamp-2 flex-1">{job.title}</h3>
                        <Badge
                          variant="secondary"
                          className={`whitespace-nowrap text-xs ${job.status === 'in_progress' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}
                        >
                          {job.displayStatus || job.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{job.description}</p>
                      <div className="flex flex-wrap gap-3 mb-3 text-xs">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          <span className="font-medium">{job.budget} {job.currency || 'USD'}</span>
                        </div>
                        {job.estimatedDuration?.value && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{job.estimatedDuration.value} {job.estimatedDuration.unit}</span>
                          </div>
                        )}
                      </div>
                      <div className="pt-2 border-t">
                        {otherUser ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={otherUser.avatar || otherUser.profilePicture} alt={otherUser.fullName} />
                              <AvatarFallback className="text-xs">
                                {otherUser.fullName?.split(' ')?.map(n => n?.[0])?.join('') || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{otherUser.fullName}</p>
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{roleLabel}</Badge>
                                {otherUser.ratings?.average && (
                                  <span className="text-[10px] text-amber-500">★ {otherUser.ratings.average}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7 bg-muted">
                              <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-muted-foreground">Loading...</p>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 mt-0.5">Provider</Badge>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Panel */}
          <div className={`md:col-span-2 flex flex-col ${!showChatOnMobile && selectedJobId ? 'hidden md:flex' : showChatOnMobile ? 'flex' : 'hidden md:flex'}`}>
            {selectedJob ? (
              <>
                <div className="border-b pb-3 mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-lg leading-tight">{selectedJob.title}</h2>
                    <p className="text-sm text-muted-foreground">{getOtherUserFromJob(selectedJob)?.fullName || 'Loading...'}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleCloseChat} className="md:hidden">
                    <X className="w-4 h-4 mr-1" /> Close
                  </Button>
                </div>
                <ScrollArea className="flex-1 border rounded-lg bg-secondary/20 p-4 mb-4">
                  <div className="space-y-4">
                    {currentMessages.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <p className="text-sm">No messages yet</p>
                        <p className="text-xs mt-1">Start the conversation to coordinate your work</p>
                      </div>
                    ) : currentMessages.map((msg) => {
                      const userId    = extractId(currentUser?._id) || extractId(currentUser?.id)
                      const isOwn     = extractId(msg.sender?._id) === userId || extractId(msg.sender?.id) === userId || msg.senderId === userId
                      const isDeleted = !!msg.deletedAt
                      const sender    = msg.sender || { fullName: 'Unknown', avatar: null }
                      const msgId     = extractId(msg._id) || extractId(msg.id)
                      return (
                        <div
                          key={msgId}
                          className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                          onMouseEnter={() => setHoveredMessageId(msgId)}
                          onMouseLeave={() => setHoveredMessageId(null)}
                        >
                          {!isOwn && (
                            <Avatar className="h-8 w-8 mt-0.5 flex-shrink-0">
                              <AvatarImage src={sender.avatar || sender.profilePicture} alt={sender.fullName} />
                              <AvatarFallback className="text-xs">
                                {sender.fullName?.split(' ')?.map(n => n?.[0])?.join('')?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className={`flex flex-col gap-1 max-w-[85%] sm:max-w-xs ${isOwn ? 'items-end' : 'items-start'}`}>
                            {!isOwn && !isDeleted && (
                              <p className="text-[10px] font-medium text-muted-foreground px-1">{sender.fullName}</p>
                            )}
                            <div className={`rounded-lg px-3.5 py-2.5 text-sm break-words ${isDeleted ? 'bg-muted text-muted-foreground italic' : isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                              <p>{isDeleted ? 'This message was deleted' : (msg.content || msg.text)}</p>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground px-1">
                              <span>{format(new Date(msg.createdAt), 'HH:mm')}</span>
                              {isOwn && msg.readBy?.length > 0 && <CheckCheck className="w-3 h-3 text-blue-500" />}
                            </div>
                            {hoveredMessageId === msgId && !isDeleted && isOwn && (
                              <div className="flex gap-0.5 mt-0.5">
                                <Button
                                  variant="ghost" size="sm" className="h-6 px-2 text-[10px] hover:bg-muted"
                                  onClick={() => { setEditingMessageId(msgId); setEditingText(msg.content || msg.text) }}
                                >Edit</Button>
                                <Button
                                  variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-red-500 hover:text-red-600"
                                  onClick={() => handleDeleteMessage(msgId)}
                                ><Trash2 className="w-3 h-3" /></Button>
                                <Button
                                  variant="ghost" size="sm" className="h-6 px-2 text-[10px] hover:bg-muted"
                                  onClick={() => setReplyingTo(msg)}
                                ><Copy className="w-3 h-3" /></Button>
                              </div>
                            )}
                          </div>
                          {isOwn && (
                            <Avatar className="h-8 w-8 mt-0.5 flex-shrink-0">
                              <AvatarImage src={currentUser?.avatar || currentUser?.profilePicture} alt={currentUser?.fullName} />
                              <AvatarFallback className="text-xs">
                                {currentUser?.fullName?.split(' ')?.map(n => n?.[0])?.join('')?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      )
                    })}
                    <div ref={scrollRef} className="h-1" />
                  </div>
                </ScrollArea>
                <div className="space-y-2">
                  {replyingTo && (
                    <div className="flex items-center justify-between bg-secondary/50 p-2.5 rounded-lg text-sm border">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground font-medium">Replying to {replyingTo.sender?.fullName || 'User'}</p>
                        <p className="text-sm truncate text-muted-foreground/80">{replyingTo.content || replyingTo.text}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)} className="h-6 w-6 p-0 flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                  {editingMessageId && (
                    <div className="flex items-center justify-between bg-secondary/50 p-2.5 rounded-lg text-sm border">
                      <div className="flex-1">
                        <p className="text-[10px] text-muted-foreground font-medium">Editing message</p>
                      </div>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => { setEditingMessageId(null); setEditingText('') }}
                        className="h-6 w-6 p-0"
                      ><X className="w-3.5 h-3.5" /></Button>
                    </div>
                  )}
                  <div className="flex gap-2 items-end">
                    {editingMessageId ? (
                      <>
                        <Textarea
                          placeholder="Edit your message..."
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="resize-none min-h-[80px] max-h-[120px]"
                          disabled={isSending}
                          autoFocus
                        />
                        <div className="flex flex-col gap-1.5 pb-1">
                          <Button onClick={() => handleEditMessage(editingMessageId)} size="icon" disabled={!editingText.trim() || isSending} className="h-9 w-9">
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => { setEditingMessageId(null); setEditingText('') }} disabled={isSending} className="h-9 w-9">
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Textarea
                          placeholder="Type your message... (Ctrl+Enter to send)"
                          value={messageInputs[selectedJobId] || ''}
                          onChange={(e) => setMessageInputs((prev) => ({ ...prev, [selectedJobId]: e.target.value }))}
                          onKeyDown={(e) => handleKeyPress(e, selectedJobId)}
                          className="resize-none min-h-[80px] max-h-[120px]"
                          disabled={isSending || (selectedJob?.status !== 'in_progress' && selectedJob?.status !== 'escrow_funded')}
                        />
                        <Button
                          onClick={() => handleSendMessage(selectedJobId)}
                          size="icon"
                          disabled={!messageInputs[selectedJobId]?.trim() || isSending || (selectedJob?.status !== 'in_progress' && selectedJob?.status !== 'escrow_funded')}
                          className="mt-auto h-10 w-10 flex-shrink-0"
                        >
                          {isSending ? <Loader2 className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4" />}
                        </Button>
                      </>
                    )}
                  </div>
                  {selectedJob?.status !== 'in_progress' && selectedJob?.status !== 'escrow_funded' && (
                    <p className="text-[10px] text-muted-foreground text-center py-1 bg-muted/30 rounded">
                      {selectedJob?.status === 'completed'
                        ? '✓ Job completed — chat is archived (read-only)'
                        : '💬 Chat available when job is in progress'}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground border rounded-lg bg-secondary/10">
                <div className="text-center p-6">
                  <UserIcon className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm font-medium">Select a job to start chatting</p>
                  <p className="text-xs text-muted-foreground mt-1">Choose from your active jobs on the left</p>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}