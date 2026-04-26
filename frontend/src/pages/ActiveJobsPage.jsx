// src/pages/ActiveJobsPage.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { 
  Send, Menu, X, Copy, Trash2, CheckCheck, Check, 
  DollarSign, Clock, RefreshCw, AlertCircle, Loader2, 
  User as UserIcon 
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import api from '../api/api'

// ============================================================================
// ⚡ MODULE-LEVEL CACHING (Survives React StrictMode Remounts)
// ============================================================================
let authPromise = null
let authResult = null

const USER_CACHE_KEY = 'dreel_user_cache_v1'
const CACHE_TTL = 1000 * 60 * 30 // 30 minutes

const getUserCache = () => {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    const now = Date.now()
    const valid = {}
    for (const [id, entry] of Object.entries(parsed)) {
      if (now - entry.timestamp < CACHE_TTL) {
        valid[id] = entry.data
      }
    }
    return valid
  } catch (e) {
    return {}
  }
}

const saveUserCache = (cache) => {
  try {
    const withTimestamp = {}
    for (const [id, data] of Object.entries(cache)) {
      withTimestamp[id] = { data, timestamp: Date.now() }
    }
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(withTimestamp))
  } catch (e) {
    console.warn('Cache save error:', e)
  }
}

let userCache = getUserCache()

// ============================================================================
// 🔄 PARALLEL USER FETCH
// ============================================================================
const fetchUsersInParallel = async (userIds) => {
  console.log(`🔍 Fetching ${userIds.length} users...`)
  const uncachedIds = [...new Set(userIds.filter(id => id && !userCache[id]))]
  
  if (uncachedIds.length === 0) {
    return userIds.map(id => userCache[id] || null)
  }

  const fetchPromises = uncachedIds.map(async (id) => {
    try {
      const { data } = await api.get(`/users/providers/${id}`, { timeout: 5000 })
      const user = data?.data?.provider || data?.user
      if (user) {
        const normalized = { ...user, _id: user._id || user.id }
        userCache[id] = normalized
        return normalized
      }
      return null
    } catch (err) {
      console.warn(`Failed to fetch user ${id}:`, err.message)
      return null
    }
  })

  const results = await Promise.allSettled(fetchPromises)
  saveUserCache(userCache)

  return userIds.map(id => {
    if (userCache[id]) return userCache[id]
    const idx = uncachedIds.indexOf(id)
    return idx !== -1 && results[idx].status === 'fulfilled' 
      ? results[idx].value 
      : null
  })
}

// ============================================================================
// 📦 JOB PREPARATION
// ============================================================================
const prepareJobForDisplay = (job) => {
  const userIdsToFetch = []
  
  const normalized = {
    ...job,
    _id: job._id || job.id,
    displayStatus: job.status === 'in_progress' ? 'Active' :
                   job.status === 'escrow_funded' ? 'Funded' : job.status,
    _clientRef: typeof job.client === 'string' ? job.client : job.client?._id || job.client?.id,
    _workerRef: typeof job.assignedWorker === 'string' ? job.assignedWorker : job.assignedWorker?._id || job.assignedWorker?.id,
    client: typeof job.client === 'object' ? job.client : userCache[job.client] || null,
    assignedWorker: typeof job.assignedWorker === 'object' ? job.assignedWorker : userCache[job.assignedWorker] || null,
  }

  if (typeof job.client === 'string' && !userCache[job.client]) userIdsToFetch.push(job.client)
  if (typeof job.assignedWorker === 'string' && !userCache[job.assignedWorker]) userIdsToFetch.push(job.assignedWorker)

  return { job: normalized, userIdsToFetch }
}

const hydrateJobWithUsers = (job, fetchedUsers) => {
  if (!fetchedUsers?.length) return job
  const hydrated = { ...job }
  
  if (job._clientRef && !job.client) {
    const client = fetchedUsers.find(u => u?._id === job._clientRef || u?.id === job._clientRef)
    if (client) hydrated.client = client
  }
  if (job._workerRef && !job.assignedWorker) {
    const worker = fetchedUsers.find(u => u?._id === job._workerRef || u?.id === job._workerRef)
    if (worker) hydrated.assignedWorker = worker
  }
  
  return hydrated
}

// ============================================================================
// 🎯 MAIN COMPONENT
// ============================================================================
export default function ActiveJobsPage() {
  console.log('🚀 ActiveJobsPage mounted')
  
  const navigate = useNavigate()
  const { jobId: paramJobId } = useParams()

  // State
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

  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [isLoadingJobs, setIsLoadingJobs] = useState(false)
  const [isHydratingUsers, setIsHydratingUsers] = useState(false)
  const [error, setError] = useState(null)

  const scrollRef = useRef(null)
  const isMounted = useRef(true)

  // Derived
  const selectedJob = useMemo(() => 
    activeJobs.find(job => job._id === selectedJobId), 
    [activeJobs, selectedJobId]
  )
  const conversationId = selectedJob?._id
  const currentMessages = conversationId ? (messages[conversationId] || []) : []

  const getOtherUserFromJob = useCallback((job) => {
    if (!job || !currentUser) return null
    const currentUserId = currentUser._id || currentUser.id
    const workerId = job.assignedWorker?._id || job.assignedWorker?.id || job._workerRef
    const clientId = job.client?._id || job.client?.id || job._clientRef
    
    if (job.assignedWorker && job.client) {
      return workerId === currentUserId 
        ? { ...job.client, role: 'client' } 
        : { ...job.assignedWorker, role: 'provider' }
    }
    return job.client ? { ...job.client, role: 'client' } : null
  }, [currentUser])

  // ============================================================================
  // 🔐 ROBUST AUTH CHECK (STRICTMODE SAFE)
  // ============================================================================
  useEffect(() => {
    console.log('🔐 Auth effect triggered')
    let localCancelled = false

    // Helper to handle auth result
    const handleAuthResult = (result) => {
      if (!localCancelled && isMounted.current) {
        if (result.user) {
          setCurrentUser(result.user)
          setError(null)
        } else {
          setError(result.error)
          if (result.shouldRedirect) {
            setTimeout(() => {
              if (isMounted.current) navigate('/login', { replace: true, state: { from: '/jobs/active' } })
            }, 1000)
          }
        }
        setIsLoadingUser(false)
      }
    }

    // 1. Check if we already have a result (StrictMode remount)
    if (authResult) {
      console.log('✅ Using cached auth result')
      handleAuthResult(authResult)
      return
    }

    // 2. Check if there's already a request in flight
    if (authPromise) {
      console.log('⏳ Waiting for existing auth request')
      authPromise
        .then(result => handleAuthResult(result))
        .catch(err => {
          console.error('Auth promise rejected:', err)
          if (!localCancelled && isMounted.current) {
            setError('Authentication failed')
            setIsLoadingUser(false)
          }
        })
      return
    }

    // 3. Start new request
    console.log('🔍 Starting new auth request')
    const AUTH_TIMEOUT = 8000 // 8 seconds

    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) throw new Error('NO_TOKEN')

        console.log('🌐 Fetching /users/profile...')
        
        const fetchPromise = api.get('/users/profile')
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AUTH_TIMEOUT')), AUTH_TIMEOUT)
        )
        
        const response = await Promise.race([fetchPromise, timeoutPromise])
        const userData = response.data?.user || response.data

        if (!userData || !(userData._id || userData.id)) {
          throw new Error('INVALID_USER_DATA')
        }

        const user = { ...userData, _id: userData._id || userData.id }
        console.log('👤 Auth success:', user.fullName)

        // Cache result globally
        authResult = { user, error: null, shouldRedirect: false }
        return authResult

      } catch (err) {
        console.error('❌ Auth error:', err.message)
        const errorResult = {
          user: null,
          error: err.message === 'NO_TOKEN' ? 'Please log in' : 
                 err.message === 'AUTH_TIMEOUT' ? 'Server slow - try again' :
                 err.response?.status === 401 ? 'Session expired' : 'Failed to load account',
          shouldRedirect: err.message === 'NO_TOKEN' || err.response?.status === 401
        }
        // Cache error globally
        authResult = errorResult
        return errorResult
      }
    }

    authPromise = checkAuth()

    authPromise
      .then(result => handleAuthResult(result))
      .catch(err => {
        console.error('Auth promise catch:', err)
        if (!localCancelled && isMounted.current) {
          setError('Authentication failed')
          setIsLoadingUser(false)
        }
      })

    return () => {
      console.log('🧹 Auth cleanup')
      localCancelled = true
      isMounted.current = false
    }
  }, [navigate])

  // ============================================================================
  // 📋 FETCH JOBS (only after auth succeeds)
  // ============================================================================
  useEffect(() => {
    const userId = currentUser?._id || currentUser?.id
    const userRole = currentUser?.role
    
    if (!userId || !userRole) {
      if (currentUser) setIsLoadingJobs(false)
      return
    }

    console.log('📋 Fetching jobs for user:', userId)
    let localCancelled = false

    const fetchAndHydrateJobs = async () => {
      try {
        setIsLoadingJobs(true)
        setError(null)

        let endpoint, params
        if (userRole === 'customer') {
          endpoint = '/jobs/my'
          params = { status: 'in_progress,escrow_funded' }
        } else if (userRole === 'provider') {
          endpoint = '/jobs/my-applications'
          params = { status: 'in_progress,escrow_funded' }
        } else {
          throw new Error(`Unsupported role: ${userRole}`)
        }

        console.log(`🌐 GET ${endpoint}`, params)
        const { data } = await api.get(endpoint, { params, timeout: 10000 })
        
        if (localCancelled || !isMounted.current) return

        const rawJobs = data.jobs || data.data?.jobs || []
        console.log(`📦 Received ${rawJobs.length} raw jobs`)

        const prepared = rawJobs.map(prepareJobForDisplay)
        const initialJobs = prepared.map(p => p.job)
        const allUserIds = [...new Set(prepared.flatMap(p => p.userIdsToFetch))]

        setActiveJobs(initialJobs)
        setIsLoadingJobs(false)

        if (allUserIds.length > 0) {
          setIsHydratingUsers(true)
          const fetchedUsers = await fetchUsersInParallel(allUserIds)
          
          if (!localCancelled && isMounted.current) {
            const hydratedJobs = initialJobs.map(job => {
              const prep = prepared.find(p => p.job._id === job._id)
              return prep ? hydrateJobWithUsers(job, fetchedUsers) : job
            })
            setActiveJobs(hydratedJobs)
          }
          setIsHydratingUsers(false)
        }

      } catch (err) {
        console.error('❌ Jobs fetch error:', err)
        if (!localCancelled && isMounted.current) {
          setIsLoadingJobs(false)
          setIsHydratingUsers(false)
          if (err.response?.status === 401) {
            setError('Authentication required')
            toast.error('Please log in again')
          } else if (err.response?.status === 403) {
            setError('Access denied')
          } else {
            setError('Failed to load jobs')
          }
        }
      }
    }

    fetchAndHydrateJobs()
    return () => { localCancelled = true }
  }, [currentUser])

  // ============================================================================
  // 💬 FETCH MESSAGES
  // ============================================================================
  useEffect(() => {
    const userId = currentUser?._id || currentUser?.id
    if (!selectedJobId || !userId) return

    console.log(`💬 Fetching messages for job ${selectedJobId}`)
    let localCancelled = false

    const fetchJobMessages = async () => {
      try {
        const { convData } = await api.post(`/chat/conversations/job/${selectedJobId}`, {}, { timeout: 8000 })
        const conversation = convData.data?.conversation || convData.conversation
        if (!conversation?._id) return

        const { msgData } = await api.get(`/chat/conversations/${conversation._id}/messages`, { timeout: 8000 })
        
        if (!localCancelled && isMounted.current) {
          const msgs = msgData.data?.messages || msgData.messages || []
          console.log(`💬 Loaded ${msgs.length} messages`)
          setMessages(prev => ({ ...prev, [selectedJobId]: msgs }))
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err)
        if (!localCancelled && isMounted.current) {
          if (!messages[selectedJobId]) {
            setMessages(prev => ({ ...prev, [selectedJobId]: [] }))
          }
        }
      }
    }

    fetchJobMessages()
    return () => { localCancelled = true }
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

  useEffect(() => {
    return () => { isMounted.current = false }
  }, [])

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
    const userId = currentUser?._id || currentUser?.id
    if (!content || !userId || isSending) return
    
    try {
      setIsSending(true)
      const { convData } = await api.post(`/chat/conversations/job/${jobId}`, {}, { timeout: 8000 })
      const conversationId = convData.data?.conversation?._id || convData.conversation?._id
      if (!conversationId) throw new Error('Could not create conversation')
      
      const { msgData } = await api.post(
        `/chat/conversations/${conversationId}/messages`, 
        { content, attachments: [], replyTo: replyingTo?._id || replyingTo?.id }, 
        { timeout: 8000 }
      )
      
      const newMessage = msgData.data?.message || msgData.message
      if (newMessage && isMounted.current) {
        setMessages(prev => ({ ...prev, [jobId]: [...(prev[jobId] || []), newMessage] }))
        setMessageInputs(prev => ({ ...prev, [jobId]: '' }))
        setReplyingTo(null)
        toast.success('Message sent', { duration: 2000 })
      }
    } catch (err) {
      console.error('Failed to send message:', err)
      toast.error(err.response?.data?.message || 'Failed to send message')
    } finally {
      if (isMounted.current) setIsSending(false)
    }
  }, [messageInputs, currentUser, isSending, replyingTo])

  const handleEditMessage = useCallback(async (messageId) => {
    if (!editingText.trim() || !currentUser) return
    try {
      setIsSending(true)
      const { data } = await api.put(`/chat/messages/${messageId}`, { content: editingText.trim() }, { timeout: 8000 })
      const updated = data.data?.message || data.message
      if (updated && isMounted.current) {
        setMessages(prev => {
          const updatedMessages = { ...prev }
          for (const [convId, msgs] of Object.entries(prev)) {
            updatedMessages[convId] = msgs.map(m => 
              m._id === messageId || m.id === messageId ? updated : m
            )
          }
          return updatedMessages
        })
        toast.success('Message updated')
      }
      setEditingMessageId(null)
      setEditingText('')
    } catch (err) {
      console.error('Failed to edit message:', err)
      toast.error('Failed to update message')
    } finally {
      if (isMounted.current) setIsSending(false)
    }
  }, [editingText, currentUser])

  const handleDeleteMessage = useCallback(async (messageId) => {
    if (!window.confirm('Delete this message?')) return
    try {
      await api.delete(`/chat/messages/${messageId}`, { timeout: 5000 })
      setMessages(prev => {
        const updated = { ...prev }
        for (const [convId, msgs] of Object.entries(prev)) {
          updated[convId] = msgs.map(m => 
            (m._id === messageId || m.id === messageId) 
              ? { ...m, deletedAt: new Date().toISOString(), content: '[deleted]' } 
              : m
          )
        }
        return updated
      })
      toast.success('Message deleted')
    } catch (err) {
      console.error('Failed to delete message:', err)
      toast.error('Failed to delete message')
    }
  }, [])

  const handleKeyPress = useCallback((e, jobId) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault()
      handleSendMessage(jobId)
    }
  }, [handleSendMessage])

  const handleSelectJob = useCallback((jobId) => {
    setSelectedJobId(jobId)
    setShowChatOnMobile(false)
  }, [])

  const handleCloseChat = useCallback(() => {
    setSelectedJobId(null)
    setShowChatOnMobile(false)
    navigate('/jobs/active')
  }, [navigate])

  const handleRetry = useCallback(() => {
    authResult = null
    authPromise = null
    setError(null)
    setIsLoadingUser(true)
    setIsLoadingJobs(false)
    setCurrentUser(null)
    window.location.reload()
  }, [])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem(USER_CACHE_KEY)
    navigate('/login', { replace: true, state: { from: '/jobs/active' } })
  }, [navigate])

  // ============================================================================
  // 🎨 RENDER
  // ============================================================================
  
  // Debug Panel
  const DebugPanel = () => (
    <details className="fixed bottom-4 right-4 z-50 bg-card border border-border rounded-lg p-3 max-w-sm text-xs">
      <summary className="cursor-pointer font-medium mb-2">🔍 Debug Info</summary>
      <div className="space-y-1 text-muted-foreground max-h-60 overflow-auto">
        <p><strong>Auth:</strong> {isLoadingUser ? 'loading' : currentUser ? `✅ ${currentUser.fullName}` : '❌ failed'}</p>
        <p><strong>Jobs:</strong> {isLoadingJobs ? 'loading' : `${activeJobs.length} loaded`}</p>
        <p><strong>Error:</strong> {error || 'none'}</p>
        <button onClick={() => { localStorage.clear(); location.reload() }} className="mt-2 text-red-500 hover:underline">
          🗑️ Clear & Reload
        </button>
      </div>
    </details>
  )

  if (error && !isLoadingUser && !isLoadingJobs) {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button variant="outline" onClick={() => navigate('/')}>Go Home</Button>
              <Button onClick={handleRetry}><RefreshCw className="w-4 h-4 mr-2" /> Try Again</Button>
            </div>
          </Card>
        </div>
        {import.meta.env?.DEV && <DebugPanel />}
      </>
    )
  }

  if (isLoadingUser || (isLoadingJobs && activeJobs.length === 0)) {
    return (
      <>
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
          <Loader2 className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
          <p className="text-muted-foreground mb-2">
            {isLoadingUser ? 'Verifying session...' : 'Loading your jobs...'}
          </p>
          <p className="text-xs text-muted-foreground/70">
            {isLoadingUser ? 'This should take <8 seconds' : 'Fetching from server...'}
          </p>
        </div>
        {import.meta.env?.DEV && <DebugPanel />}
      </>
    )
  }

  if (!currentUser && !isLoadingUser) {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Session Issue</h2>
            <p className="text-muted-foreground mb-6">Could not load your account. Please try logging in again.</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate('/login', { state: { from: '/jobs/active' } })}>Log In Again</Button>
              <Button variant="outline" onClick={handleRetry}>Retry</Button>
            </div>
          </Card>
        </div>
        {import.meta.env?.DEV && <DebugPanel />}
      </>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">Dreelancing</h1>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {currentUser?.role === 'provider' ? 'Provider' : 'Client'}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {selectedJobId && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden" 
                  onClick={() => setShowChatOnMobile(!showChatOnMobile)}
                  aria-label={showChatOnMobile ? 'Show jobs list' : 'Show chat'}
                >
                  {showChatOnMobile ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
              )}
              
              <div className="flex items-center gap-2 ml-2">
                <Avatar className="h-8 w-8 cursor-pointer" onClick={handleLogout}>
                  <AvatarImage src={currentUser?.avatar || currentUser?.profilePicture} alt={currentUser?.fullName} />
                  <AvatarFallback className="bg-primary/10">
                    {currentUser?.fullName?.split(' ')?.map(n => n?.[0])?.join('')?.toUpperCase() || 
                     currentUser?.email?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 container mx-auto px-4 py-6 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-120px)]">
            
            {/* Jobs List Panel */}
            <div className={`md:col-span-1 flex flex-col ${showChatOnMobile && selectedJobId ? 'hidden md:flex' : ''}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Active Jobs</h2>
                {isHydratingUsers && (
                  <Badge variant="outline" className="text-xs">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Loading profiles
                  </Badge>
                )}
              </div>
              
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-3">
                  {activeJobs.length === 0 && !isLoadingJobs ? (
                    <Card className="p-6 text-center">
                      <p className="text-muted-foreground mb-4">
                        {currentUser?.role === 'customer' || currentUser?.role === 'client'
                          ? "You don't have any active jobs yet."
                          : "You don't have any active assignments yet."}
                      </p>
                      {currentUser?.role === 'customer' || currentUser?.role === 'client' ? (
                        <Button onClick={() => navigate('/jobs/post')} size="sm">Post a Job</Button>
                      ) : (
                        <Button onClick={() => navigate('/jobs')} size="sm">Browse Jobs</Button>
                      )}
                    </Card>
                  ) : (
                    activeJobs.map((job) => {
                      const otherUser = getOtherUserFromJob(job)
                      const roleLabel = otherUser?.role === 'provider' ? 'Provider' : 'Client'
                      const isSelected = selectedJobId === job._id
                      
                      return (
                        <Card 
                          key={job._id} 
                          className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                            isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
                          }`}
                          onClick={() => handleSelectJob(job._id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && handleSelectJob(job._id)}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-sm line-clamp-2 flex-1">{job.title}</h3>
                            <Badge 
                              variant="secondary" 
                              className={`whitespace-nowrap text-xs ${
                                job.status === 'in_progress' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 
                                'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                              }`}
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
                    })
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Chat Panel */}
            <div className={`md:col-span-2 flex flex-col ${
              !showChatOnMobile && selectedJobId ? 'hidden md:flex' : 
              showChatOnMobile ? 'flex' : 'hidden md:flex'
            }`}>
              {selectedJob ? (
                <>
                  {/* Chat Header */}
                  <div className="border-b pb-3 mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-lg leading-tight">{selectedJob.title}</h2>
                      <p className="text-sm text-muted-foreground">
                        {getOtherUserFromJob(selectedJob)?.fullName || 'Loading...'}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleCloseChat} className="md:hidden">
                      <X className="w-4 h-4 mr-1" /> Close
                    </Button>
                  </div>

                  {/* Messages Area */}
                  <ScrollArea className="flex-1 border rounded-lg bg-secondary/20 p-4 mb-4">
                    <div className="space-y-4">
                      {currentMessages.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <p className="text-sm">No messages yet</p>
                          <p className="text-xs mt-1">Start the conversation to coordinate your work</p>
                        </div>
                      ) : (
                        currentMessages.map((msg) => {
                          const userId = currentUser?._id || currentUser?.id
                          const isOwn = msg.sender?._id === userId || msg.sender?.id === userId || msg.senderId === userId
                          const isDeleted = !!msg.deletedAt
                          const sender = msg.sender || { fullName: 'Unknown', avatar: null }
                          
                          return (
                            <div 
                              key={msg._id || msg.id} 
                              className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                              onMouseEnter={() => setHoveredMessageId(msg._id || msg.id)}
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
                                  <p className="text-[10px] font-medium text-muted-foreground px-1">
                                    {sender.fullName}
                                  </p>
                                )}
                                
                                <div className={`rounded-lg px-3.5 py-2.5 text-sm break-words ${
                                  isDeleted 
                                    ? 'bg-muted text-muted-foreground italic' 
                                    : isOwn 
                                      ? 'bg-primary text-primary-foreground' 
                                      : 'bg-muted text-foreground'
                                }`}>
                                  <p>{isDeleted ? 'This message was deleted' : (msg.content || msg.text)}</p>
                                </div>
                                
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground px-1">
                                  <span>{format(new Date(msg.createdAt), 'HH:mm')}</span>
                                  {isOwn && msg.readBy?.length > 0 && (
                                    <CheckCheck className="w-3 h-3 text-blue-500" />
                                  )}
                                </div>
                                
                                {hoveredMessageId === (msg._id || msg.id) && !isDeleted && isOwn && (
                                  <div className="flex gap-0.5 mt-0.5">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-6 px-2 text-[10px] hover:bg-muted"
                                      onClick={() => { 
                                        setEditingMessageId(msg._id || msg.id)
                                        setEditingText(msg.content || msg.text) 
                                      }}
                                    >
                                      Edit
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-6 px-2 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                      onClick={() => handleDeleteMessage(msg._id || msg.id)}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-6 px-2 text-[10px] hover:bg-muted"
                                      onClick={() => setReplyingTo(msg)}
                                    >
                                      <Copy className="w-3 h-3" />
                                    </Button>
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
                        })
                      )}
                      <div ref={scrollRef} className="h-1" />
                    </div>
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="space-y-2">
                    {replyingTo && (
                      <div className="flex items-center justify-between bg-secondary/50 p-2.5 rounded-lg text-sm border">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-muted-foreground font-medium">
                            Replying to {replyingTo.sender?.fullName || 'User'}
                          </p>
                          <p className="text-sm truncate text-muted-foreground/80">
                            {replyingTo.content || replyingTo.text}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setReplyingTo(null)} 
                          className="h-6 w-6 p-0 flex-shrink-0"
                        >
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
                          variant="ghost" 
                          size="sm" 
                          onClick={() => { setEditingMessageId(null); setEditingText('') }} 
                          className="h-6 w-6 p-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
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
                            <Button 
                              onClick={() => handleEditMessage(editingMessageId)} 
                              size="icon" 
                              disabled={!editingText.trim() || isSending}
                              className="h-9 w-9"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={() => { setEditingMessageId(null); setEditingText('') }} 
                              disabled={isSending}
                              className="h-9 w-9"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <Textarea 
                            placeholder="Type your message... (Ctrl+Enter to send)" 
                            value={messageInputs[selectedJobId] || ''} 
                            onChange={(e) => setMessageInputs((prev) => ({ 
                              ...prev, 
                              [selectedJobId]: e.target.value 
                            }))} 
                            onKeyDown={(e) => handleKeyPress(e, selectedJobId)} 
                            className="resize-none min-h-[80px] max-h-[120px]" 
                            disabled={isSending || selectedJob?.status !== 'in_progress'}
                          />
                          <Button 
                            onClick={() => handleSendMessage(selectedJobId)} 
                            size="icon" 
                            disabled={!messageInputs[selectedJobId]?.trim() || isSending || selectedJob?.status !== 'in_progress'} 
                            className="mt-auto h-10 w-10 flex-shrink-0"
                          >
                            {isSending ? (
                              <Loader2 className="animate-spin h-4 w-4" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                    
                    {selectedJob?.status !== 'in_progress' && (
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
                    <p className="text-xs text-muted-foreground mt-1">
                      Choose from your active jobs on the left
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      {import.meta.env?.DEV && <DebugPanel />}
    </>
  )
}