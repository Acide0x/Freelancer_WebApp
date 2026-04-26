// src/pages/ActiveJobsPage.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Send, Menu, X, Copy, Trash2, CheckCheck, Check, DollarSign, Clock, RefreshCw, AlertCircle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import api from '../api/api' // ✅ Import like your DiscussionPage

// ============================================================================
// 🎯 MAIN COMPONENT
// ============================================================================

export default function ActiveJobsPage() {
  const navigate = useNavigate()
  const { jobId: paramJobId } = useParams()

  // Local state
  const [selectedJobId, setSelectedJobId] = useState(paramJobId || null)
  const [messageInputs, setMessageInputs] = useState({})
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editingText, setEditingText] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [showChatOnMobile, setShowChatOnMobile] = useState(false)
  const [hoveredMessageId, setHoveredMessageId] = useState(null)
  
  // API data state
  const [currentUser, setCurrentUser] = useState(null)
  const [activeJobs, setActiveJobs] = useState([])
  const [messages, setMessages] = useState({})
  
  // Loading & error state
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)

  // Refs
  const scrollRef = useRef(null)
  const isMounted = useRef(true)
  const loadTimeoutRef = useRef(null)

  // Get selected job object
  const selectedJob = useMemo(() => {
    return activeJobs.find((job) => job._id === selectedJobId)
  }, [activeJobs, selectedJobId])

  const conversationId = selectedJob ? selectedJob._id : null
  const currentMessages = conversationId ? (messages[conversationId] || []) : []

  // Helper: Get the other user in the job conversation
  const getOtherUserFromJob = useCallback((job) => {
    if (job.assignedWorker && job.client) {
      return job.assignedWorker._id === currentUser?._id 
        ? { ...job.client, role: 'client' }
        : { ...job.assignedWorker, role: 'provider' }
    }
    return job.client ? { ...job.client, role: 'client' } : null
  }, [currentUser])

  // ============================================================================
  // 🔄 DATA FETCHING WITH API.CALLS
  // ============================================================================

  // Fetch current user profile
  useEffect(() => {
    let cancelled = false
    
    const fetchCurrentUser = async () => {
      try {
        const { data } = await api.get('/users/profile')
        
        if (!cancelled && isMounted.current && data?.user) {
          setCurrentUser(data.user)
          setError(null)
        }
      } catch (err) {
        console.error('Failed to fetch user:', err)
        
        if (!cancelled && isMounted.current) {
          if (err.response?.status === 401) {
            setError('Please log in to view active jobs')
            toast.error('Session expired. Please log in again.')
            setTimeout(() => navigate('/login', { replace: true }), 2000)
          } else {
            setError('Failed to load user. Check your connection.')
          }
        }
      }
    }
    
    fetchCurrentUser()
    
    return () => { cancelled = true }
  }, [navigate])

  // Fetch active jobs based on user role
  useEffect(() => {
    if (!currentUser?._id || !currentUser?.role) return
    
    let cancelled = false
    
    const fetchActiveJobs = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        let endpoint, params
        
        if (currentUser.role === 'customer') {
          endpoint = '/jobs/my'
          params = { status: 'in_progress,escrow_funded' }
        } else if (currentUser.role === 'provider') {
          endpoint = '/jobs/my-applications'
          params = { status: 'in_progress,escrow_funded' }
        } else {
          throw new Error(`Unsupported role: ${currentUser.role}`)
        }
        
        const { data } = await api.get(endpoint, { params })
        
        if (!cancelled && isMounted.current) {
          const jobs = (data.jobs || []).map(job => ({
            ...job,
            client: job.client || job.job?.client,
            assignedWorker: job.assignedWorker || job.job?.assignedWorker,
            displayStatus: job.status === 'in_progress' ? 'Active' : 
                          job.status === 'escrow_funded' ? 'Funded' : job.status
          }))
          setActiveJobs(jobs)
          setIsLoading(false)
        }
      } catch (err) {
        console.error('Failed to fetch jobs:', err)
        
        if (!cancelled && isMounted.current) {
          setIsLoading(false)
          
          if (err.response?.status === 401) {
            setError('Authentication required')
            toast.error('Please log in again')
          } else {
            setError('Failed to load jobs. Check your connection.')
          }
          
          // Auto-retry once after 3 seconds
          if (retryCount < 1) {
            loadTimeoutRef.current = setTimeout(() => {
              setRetryCount(prev => prev + 1)
            }, 3000)
          }
        }
      }
    }
    
    fetchActiveJobs()
    
    // Fallback timeout: if still loading after 10s, show error
    loadTimeoutRef.current = setTimeout(() => {
      if (isLoading && isMounted.current) {
        setError('Loading took too long. Please refresh.')
        setIsLoading(false)
      }
    }, 10000)
    
    return () => {
      cancelled = true
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current)
    }
  }, [currentUser, retryCount])

  // Fetch chat messages when job is selected
  useEffect(() => {
    if (!selectedJobId || !currentUser?._id) return
    
    let cancelled = false
    
    const fetchJobMessages = async () => {
      try {
        // Step 1: Get or create conversation via POST
        const { data: convData } = await api.post(`/chat/conversations/job/${selectedJobId}`)
        const conversation = convData.data?.conversation
        
        if (!conversation?._id) return
        
        // Step 2: Fetch messages via GET
        const { data: msgData } = await api.get(`/chat/conversations/${conversation._id}/messages`)
        
        if (!cancelled && isMounted.current) {
          setMessages(prev => ({
            ...prev,
            [selectedJobId]: msgData.data?.messages || []
          }))
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err)
        // Don't block UI - chat can load lazily
        if (!cancelled && isMounted.current) {
          setMessages(prev => ({
            ...prev,
            [selectedJobId]: []
          }))
        }
      }
    }
    
    fetchJobMessages()
    
    return () => { cancelled = true }
  }, [selectedJobId, currentUser])

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current && currentMessages.length > 0) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [currentMessages])

  // Sync URL param with selected job
  useEffect(() => {
    if (paramJobId && paramJobId !== selectedJobId) {
      setSelectedJobId(paramJobId)
    }
  }, [paramJobId])

  // Update URL when job selection changes
  useEffect(() => {
    if (selectedJobId) {
      navigate(`/jobs/active/${selectedJobId}`, { replace: true })
    } else {
      navigate('/jobs/active', { replace: true })
    }
  }, [selectedJobId, navigate])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current)
    }
  }, [])

  // ============================================================================
  // 💬 MESSAGE HANDLERS USING API.POST/DELETE/PATCH
  // ============================================================================

  const handleSendMessage = useCallback(
    async (jobId) => {
      const content = messageInputs[jobId]?.trim()
      if (!content || !currentUser?._id) return

      try {
        setIsSending(true)
        
        // Step 1: Get/create conversation via POST
        const { data: convData } = await api.post(`/chat/conversations/job/${jobId}`)
        const conversationId = convData.data?.conversation?._id
        
        if (!conversationId) throw new Error('Could not create conversation')
        
        // Step 2: Send message via POST
        const { data: msgData } = await api.post(
          `/chat/conversations/${conversationId}/messages`,
          { content, attachments: [] }
        )
        
        const newMessage = msgData.data?.message
        
        if (newMessage && isMounted.current) {
          setMessages(prev => ({
            ...prev,
            [jobId]: [...(prev[jobId] || []), newMessage]
          }))
          
          setMessageInputs(prev => ({ ...prev, [jobId]: '' }))
          setReplyingTo(null)
          toast.success('Message sent')
        }
      } catch (err) {
        console.error('Failed to send message:', err)
        toast.error('Failed to send message. Please try again.')
      } finally {
        if (isMounted.current) setIsSending(false)
      }
    },
    [messageInputs, currentUser]
  )

  const handleEditMessage = useCallback(
    async (messageId) => {
      if (!editingText.trim() || !currentUser?._id) return

      try {
        // Optimistic update (backend edit endpoint not implemented yet)
        // If you add PATCH /chat/messages/:id later, uncomment below:
        /*
        await api.patch(`/chat/messages/${messageId}`, {
          content: editingText.trim()
        })
        */
        
        setMessages(prev => {
          const updated = { ...prev }
          for (const key in updated) {
            updated[key] = updated[key].map((msg) =>
              msg._id === messageId
                ? { ...msg, text: editingText.trim(), updatedAt: new Date().toISOString() }
                : msg
            )
          }
          return updated
        })

        setEditingMessageId(null)
        setEditingText('')
        toast.success('Message updated')
      } catch (err) {
        console.error('Failed to edit message:', err)
        toast.error('Failed to update message')
      }
    },
    [editingText, currentUser]
  )

  const handleDeleteMessage = useCallback(
    async (messageId) => {
      if (!currentUser?._id) return

      try {
        // Soft delete via DELETE
        await api.delete(`/chat/messages/${messageId}`)
        
        // Update local state optimistically
        setMessages(prev => {
          const updated = { ...prev }
          for (const key in updated) {
            updated[key] = updated[key].map((msg) =>
              msg._id === messageId
                ? { ...msg, deletedAt: new Date().toISOString(), text: '[Deleted]' }
                : msg
            )
          }
          return updated
        })
        
        toast.success('Message deleted')
      } catch (err) {
        console.error('Failed to delete message:', err)
        toast.error('Failed to delete message')
      }
    },
    [currentUser]
  )

  const handleKeyPress = useCallback(
    (e, jobId) => {
      if (e.ctrlKey && e.key === 'Enter') {
        handleSendMessage(jobId)
      }
    },
    [handleSendMessage]
  )

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
    setError(null)
    setRetryCount(prev => prev + 1)
    setIsLoading(true)
    setCurrentUser(prev => ({ ...prev }))
  }, [])

  // ============================================================================
  // 🎨 RENDER
  // ============================================================================

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unable to Load</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/')}>
              Go Home
            </Button>
            <Button onClick={handleRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Show loading state
  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
        <p className="text-muted-foreground mb-2">Loading your active jobs...</p>
        <p className="text-xs text-muted-foreground/70">
          {retryCount > 0 ? `Retry attempt ${retryCount + 1}` : 'Fetching from server'}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b sticky top-0 z-20 bg-background">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dreelancing</h1>
            <p className="text-sm text-muted-foreground">Active Jobs</p>
          </div>
          {selectedJobId && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setShowChatOnMobile(!showChatOnMobile)}
            >
              {showChatOnMobile ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
          {/* Jobs List */}
          <div className={`md:col-span-1 ${showChatOnMobile && selectedJobId ? 'hidden md:block' : ''}`}>
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-4 pr-4">
                {activeJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      {currentUser?.role === 'customer' 
                        ? "You don't have any active jobs yet."
                        : "You don't have any active job assignments yet."}
                    </p>
                    {currentUser?.role === 'customer' && (
                      <Button onClick={() => navigate('/jobs/post')}>
                        Post a Job
                      </Button>
                    )}
                    {currentUser?.role === 'provider' && (
                      <Button onClick={() => navigate('/jobs')}>
                        Browse Open Jobs
                      </Button>
                    )}
                  </div>
                ) : (
                  activeJobs.map((job) => {
                    const otherUser = getOtherUserFromJob(job)
                    const roleLabel = otherUser?.role === 'provider' ? 'Provider' : 'Client'
                    const isSelected = selectedJobId === job._id

                    return (
                      <Card
                        key={job._id}
                        className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                          isSelected ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => handleSelectJob(job._id)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <h3 className="font-semibold text-sm line-clamp-2 flex-1">{job.title}</h3>
                          <Badge 
                            variant="default" 
                            className={`whitespace-nowrap ${
                              job.status === 'in_progress' ? 'bg-green-600' : 'bg-blue-600'
                            }`}
                          >
                            {job.displayStatus || job.status}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{job.description}</p>

                        <div className="flex flex-wrap gap-3 mb-4 text-xs">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            <span className="font-semibold">{job.budget} {job.currency || 'USD'}</span>
                          </div>
                          {job.estimatedDuration?.value && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{job.estimatedDuration.value} {job.estimatedDuration.unit}</span>
                            </div>
                          )}
                        </div>

                        {otherUser && (
                          <div className="flex items-center gap-2 pt-3 border-t">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={otherUser.avatar || otherUser.profilePicture || '/placeholder.svg'}
                                alt={otherUser.fullName}
                              />
                              <AvatarFallback>
                                {otherUser.fullName?.split(' ')?.map(n => n?.[0])?.join('') || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{otherUser.fullName}</p>
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="text-xs">{roleLabel}</Badge>
                                {otherUser.ratings?.average && (
                                  <span className="text-xs text-yellow-500">★ {otherUser.ratings.average}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </Card>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Panel */}
          <div className={`md:col-span-2 flex flex-col ${!showChatOnMobile && selectedJobId ? 'hidden md:flex' : showChatOnMobile ? 'flex' : 'hidden md:flex'}`}>
            {selectedJob ? (
              <>
                <div className="border-b pb-4 mb-4">
                  <h2 className="font-semibold text-lg mb-2">{selectedJob.title}</h2>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{getOtherUserFromJob(selectedJob)?.fullName}</span>
                    <Button variant="ghost" size="sm" onClick={handleCloseChat} className="md:hidden">Close</Button>
                  </div>
                </div>

                <ScrollArea className="flex-1 border rounded-lg bg-secondary/20 p-4 mb-4">
                  <div className="space-y-4">
                    {currentMessages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No messages yet. Start the conversation!
                      </div>
                    ) : (
                      currentMessages.map((msg) => {
                        const isOwn = msg.sender?._id === currentUser?._id || msg.senderId === currentUser?._id
                        const isDeleted = !!msg.deletedAt
                        const sender = msg.sender || { fullName: 'Unknown', avatar: null }

                        return (
                          <div key={msg._id} className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                            onMouseEnter={() => setHoveredMessageId(msg._id)}
                            onMouseLeave={() => setHoveredMessageId(null)}
                          >
                            {!isOwn && (
                              <Avatar className="h-8 w-8 mt-1">
                                <AvatarImage src={sender.avatar || sender.profilePicture || '/placeholder.svg'} alt={sender.fullName} />
                                <AvatarFallback>{sender.fullName?.split(' ')?.map(n => n?.[0])?.join('') || '?'}</AvatarFallback>
                              </Avatar>
                            )}

                            <div className={`flex flex-col gap-1 max-w-xs ${isOwn ? 'items-end' : 'items-start'}`}>
                              <div className={`rounded-lg px-4 py-2 text-sm break-words ${
                                isDeleted ? 'bg-muted text-muted-foreground italic' :
                                isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                              }`}>
                                {!isOwn && <p className="text-xs font-semibold mb-1 opacity-75">{sender.fullName}</p>}
                                <p>{isDeleted ? 'This message was deleted' : msg.content || msg.text}</p>
                              </div>

                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{format(new Date(msg.createdAt), 'HH:mm')}</span>
                                {isOwn && msg.readBy?.length > 0 && <CheckCheck className="w-3 h-3 text-blue-500" />}
                              </div>

                              {hoveredMessageId === msg._id && !isDeleted && isOwn && (
                                <div className="flex gap-1 mt-1">
                                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs"
                                    onClick={() => { setEditingMessageId(msg._id); setEditingText(msg.content || msg.text); }}>
                                    Edit
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-red-500 hover:text-red-600"
                                    onClick={() => handleDeleteMessage(msg._id)}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs"
                                    onClick={() => setReplyingTo(msg)}>
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                            </div>

                            {isOwn && (
                              <Avatar className="h-8 w-8 mt-1">
                                <AvatarImage src={currentUser?.avatar || currentUser?.profilePicture || '/placeholder.svg'} alt={currentUser?.fullName} />
                                <AvatarFallback>{currentUser?.fullName?.split(' ')?.map(n => n?.[0])?.join('') || '?'}</AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        )
                      })
                    )}
                    <div ref={scrollRef} />
                  </div>
                </ScrollArea>

                <div className="space-y-2">
                  {replyingTo && (
                    <div className="flex items-center justify-between bg-secondary/50 p-3 rounded-lg text-sm">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Replying to {replyingTo.sender?.fullName || 'User'}</p>
                        <p className="text-sm truncate">{replyingTo.content || replyingTo.text}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)} className="h-6 w-6 p-0">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {editingMessageId && (
                    <div className="flex items-center justify-between bg-secondary/50 p-3 rounded-lg text-sm">
                      <div className="flex-1"><p className="text-xs text-muted-foreground">Editing message</p></div>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingMessageId(null); setEditingText(''); }} className="h-6 w-6 p-0">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {editingMessageId ? (
                      <>
                        <Textarea placeholder="Edit your message..." value={editingText} onChange={(e) => setEditingText(e.target.value)} className="resize-none h-20" disabled={isSending} />
                        <div className="flex flex-col gap-2">
                          <Button onClick={() => handleEditMessage(editingMessageId)} size="icon" disabled={!editingText.trim() || isSending}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => { setEditingMessageId(null); setEditingText(''); }} disabled={isSending}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Textarea placeholder="Type your message... (Ctrl+Enter to send)" value={messageInputs[selectedJobId] || ''}
                          onChange={(e) => setMessageInputs((prev) => ({ ...prev, [selectedJobId]: e.target.value }))}
                          onKeyDown={(e) => handleKeyPress(e, selectedJobId)} className="resize-none h-20"
                          disabled={isSending || selectedJob?.status !== 'in_progress'} />
                        <Button onClick={() => handleSendMessage(selectedJobId)} size="icon"
                          disabled={!messageInputs[selectedJobId]?.trim() || isSending || selectedJob?.status !== 'in_progress'} className="mt-auto">
                          {isSending ? <Loader2 className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" /> : <Send className="w-4 h-4" />}
                        </Button>
                      </>
                    )}
                  </div>
                  
                  {selectedJob?.status !== 'in_progress' && (
                    <p className="text-xs text-muted-foreground text-center">
                      {selectedJob?.status === 'completed' ? 'Job completed — chat is archived (read-only)' : 'Chat available when job is in progress'}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Select a job to start chatting</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}