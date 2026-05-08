// // src/pages/JobChatPage.jsx
// //
// // Route: /jobs/active/:jobId/chat
// // Navigates back to /jobs/active on close.
// //
// // Re-uses the shared helpers exported from ActiveJobsPage.jsx.
// // (If you extract them to src/lib/jobHelpers.js, update the import path.)

// import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
// import { useNavigate, useParams } from 'react-router-dom'
// import { Button } from '@/components/ui/button'
// import { Textarea } from '@/components/ui/textarea'
// import { ScrollArea } from '@/components/ui/scroll-area'
// import { Badge } from '@/components/ui/badge'
// import { Card } from '@/components/ui/card'
// import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
// import {
//   Send, X, Copy, Trash2, CheckCheck, Check,
//   DollarSign, Clock, AlertCircle, Loader2, ArrowLeft,
// } from 'lucide-react'
// import { format } from 'date-fns'
// import { toast } from 'sonner'
// import api from '../api/api'

// // ── import shared helpers from ActiveJobsPage (or your shared lib) ──────────
// import {
//   extractId,
//   getDisplayStatus,
//   prepareJobForDisplay,
//   hydrateJobWithUsers,
//   fetchUsersInParallel,
//   EXCLUDED_STATUSES,
// } from './ActiveJobsPage'

// const CHAT_ALLOWED_STATUSES = ['in_progress', 'escrow_funded', 'accepted']

// // ============================================================================
// // 🎯 JOB CHAT PAGE
// // ============================================================================
// export default function JobChatPage() {
//   const navigate = useNavigate()
//   const { jobId } = useParams()

//   const [currentUser, setCurrentUser] = useState(null)
//   const [job, setJob] = useState(null)
//   const [messages, setMessages] = useState([])
//   const [isLoadingJob, setIsLoadingJob] = useState(true)
//   const [isLoadingMessages, setIsLoadingMessages] = useState(false)
//   const [error, setError] = useState(null)

//   const [messageInput, setMessageInput] = useState('')
//   const [editingMessageId, setEditingMessageId] = useState(null)
//   const [editingText, setEditingText] = useState('')
//   const [replyingTo, setReplyingTo] = useState(null)
//   const [hoveredMessageId, setHoveredMessageId] = useState(null)
//   const [isSending, setIsSending] = useState(false)

//   const scrollRef = useRef(null)
//   const isMounted = useRef(true)
//   const navigateRef = useRef(navigate)
//   useEffect(() => { navigateRef.current = navigate }, [navigate])

//   const currentUserId = useMemo(
//     () => extractId(currentUser?._id) || extractId(currentUser?.id) || null,
//     [currentUser]
//   )

//   const getOtherUser = useCallback(() => {
//     if (!job || !currentUserId) return null
//     const workerId = extractId(job.assignedWorker?._id) || extractId(job.assignedWorker?.id)
//     if (job.assignedWorker && job.client) {
//       return workerId === currentUserId
//         ? { ...job.client, role: 'client' }
//         : { ...job.assignedWorker, role: 'provider' }
//     }
//     return job.client ? { ...job.client, role: 'client' } : null
//   }, [job, currentUserId])

//   // ── Load current user from localStorage ─────────────────────────────────
//   useEffect(() => {
//     const storedUser = localStorage.getItem('user')
//     const token = localStorage.getItem('token')
//     if (!token || !storedUser) {
//       navigateRef.current('/login', { replace: true, state: { from: `/jobs/active/${jobId}/chat` } })
//       return
//     }
//     try {
//       const parsed = JSON.parse(storedUser)
//       const uid = parsed._id || parsed.id
//       if (!uid) { setError('Invalid user session'); return }
//       setCurrentUser({ ...parsed, _id: uid })
//     } catch { setError('Corrupted user session') }
//   }, [jobId])

//   // ── Fetch job details ────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!jobId || !currentUserId) return
//     let cancelled = false

//     const fetchJob = async () => {
//       setIsLoadingJob(true)
//       try {
//         // Try to get the specific job from the appropriate list endpoint
//         const role = currentUser?.role
//         const isClient = ['customer', 'client', 'individual', 'shelter'].includes(role)
//         const isProviderRole = ['provider', 'freelancer'].includes(role)
//         const endpoint = isClient ? '/jobs/my' : isProviderRole ? '/jobs/assigned' : null

//         if (!endpoint) { setIsLoadingJob(false); return }

//         const { data } = await api.get(endpoint, { timeout: 8000 })
//         if (cancelled || !isMounted.current) return

//         const rawJobs =
//           data?.jobs ||
//           data?.data?.jobs ||
//           (Array.isArray(data?.data) ? data.data : null) ||
//           (Array.isArray(data) ? data : [])

//         const found = rawJobs.find(j => {
//           const jId = extractId(j._id) || extractId(j.id)
//           return jId === jobId
//         })

//         if (!found) { setError('Job not found'); setIsLoadingJob(false); return }

//         const { job: prepared, userIdsToFetch } = prepareJobForDisplay(found)

//         if (!cancelled && isMounted.current) setJob(prepared)

//         if (userIdsToFetch.length > 0) {
//           const fetchedUsers = await fetchUsersInParallel(userIdsToFetch)
//           if (!cancelled && isMounted.current) {
//             setJob(prev => prev ? hydrateJobWithUsers(prev, fetchedUsers) : prev)
//           }
//         }
//       } catch (err) {
//         if (!cancelled && isMounted.current) {
//           setError(err.response?.data?.message || 'Failed to load job')
//         }
//       } finally {
//         if (!cancelled && isMounted.current) setIsLoadingJob(false)
//       }
//     }

//     fetchJob()
//     return () => { cancelled = true }
//   }, [jobId, currentUserId]) // eslint-disable-line react-hooks/exhaustive-deps

//   // ── Fetch messages ───────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!jobId || !currentUserId) return
//     let cancelled = false

//     const fetchMessages = async () => {
//       setIsLoadingMessages(true)
//       try {
//         const { data: convData } = await api.post(
//           `/chat/conversations/job/${jobId}`, {}, { timeout: 5000 }
//         )
//         const conversation = convData?.data?.conversation || convData?.conversation
//         if (!conversation?._id) { setMessages([]); return }

//         const { data: msgData } = await api.get(
//           `/chat/conversations/${conversation._id}/messages`, { timeout: 5000 }
//         )
//         if (!cancelled && isMounted.current) {
//           setMessages(msgData?.data?.messages || [])
//         }
//       } catch (err) {
//         if (err.response?.status === 404 && !cancelled && isMounted.current) {
//           setMessages([])
//           return
//         }
//         console.error('[JobChat] messages error:', err)
//       } finally {
//         if (!cancelled && isMounted.current) setIsLoadingMessages(false)
//       }
//     }

//     fetchMessages()
//     return () => { cancelled = true }
//   }, [jobId, currentUserId])

//   // ── Auto-scroll ──────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!scrollRef.current || messages.length === 0) return
//     const t = setTimeout(() => {
//       if (scrollRef.current && isMounted.current) {
//         scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
//       }
//     }, 100)
//     return () => clearTimeout(t)
//   }, [messages])

//   useEffect(() => { return () => { isMounted.current = false } }, [])

//   // ── Handlers ─────────────────────────────────────────────────────────────
//   const handleSendMessage = useCallback(async () => {
//     const content = messageInput.trim()
//     if (!content || !currentUserId || isSending) return
//     try {
//       setIsSending(true)
//       const { data: convData } = await api.post(
//         `/chat/conversations/job/${jobId}`, {}, { timeout: 5000 }
//       )
//       const convId =
//         extractId(convData?.data?.conversation?._id) ||
//         extractId(convData?.conversation?._id)
//       if (!convId) throw new Error('Could not create conversation')

//       const { data: msgData } = await api.post(
//         `/chat/conversations/${convId}/messages`,
//         {
//           content,
//           attachments: [],
//           replyTo: extractId(replyingTo?._id) || extractId(replyingTo?.id),
//         },
//         { timeout: 5000 }
//       )
//       const newMessage = msgData?.data?.message || msgData?.message
//       if (newMessage && isMounted.current) {
//         setMessages(prev => [...prev, newMessage])
//         setMessageInput('')
//         setReplyingTo(null)
//         toast.success('Message sent', { duration: 2000 })
//       }
//     } catch (err) {
//       console.error('Send error:', err)
//       toast.error(err.response?.data?.message || 'Failed to send')
//     } finally {
//       if (isMounted.current) setIsSending(false)
//     }
//   }, [messageInput, currentUserId, isSending, replyingTo, jobId])

//   const handleEditMessage = useCallback(async (messageId) => {
//     if (!editingText.trim() || !currentUserId) return
//     try {
//       setIsSending(true)
//       const { data } = await api.put(
//         `/chat/messages/${messageId}`,
//         { content: editingText.trim() },
//         { timeout: 5000 }
//       )
//       const updated = data?.data?.message || data?.message
//       if (updated && isMounted.current) {
//         setMessages(prev => prev.map(m =>
//           extractId(m._id) === messageId || extractId(m.id) === messageId ? updated : m
//         ))
//         toast.success('Message updated')
//       }
//       setEditingMessageId(null)
//       setEditingText('')
//     } catch (err) {
//       console.error('Edit error:', err)
//       toast.error('Failed to update')
//     } finally {
//       if (isMounted.current) setIsSending(false)
//     }
//   }, [editingText, currentUserId])

//   const handleDeleteMessage = useCallback(async (messageId) => {
//     if (!window.confirm('Delete this message?')) return
//     try {
//       await api.delete(`/chat/messages/${messageId}`, { timeout: 3000 })
//       setMessages(prev => prev.map(m =>
//         extractId(m._id) === messageId || extractId(m.id) === messageId
//           ? { ...m, deletedAt: new Date().toISOString(), content: '[deleted]' }
//           : m
//       ))
//       toast.success('Message deleted')
//     } catch (err) {
//       console.error('Delete error:', err)
//       toast.error('Failed to delete')
//     }
//   }, [])

//   const handleKeyDown = useCallback((e) => {
//     if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handleSendMessage() }
//   }, [handleSendMessage])

//   // ── Derived ──────────────────────────────────────────────────────────────
//   const isChatAllowed = CHAT_ALLOWED_STATUSES.includes(job?.status)
//   const otherUser = getOtherUser()

//   // ── Render states ────────────────────────────────────────────────────────
//   if (isLoadingJob) {
//     return (
//       <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
//         <Loader2 className="animate-spin h-12 w-12 text-primary mb-4" />
//         <p className="text-muted-foreground">Loading chat...</p>
//       </div>
//     )
//   }

//   if (error) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center p-4">
//         <Card className="max-w-md w-full p-6 text-center">
//           <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
//           <h2 className="text-xl font-semibold mb-2">Error</h2>
//           <p className="text-muted-foreground mb-6">{error}</p>
//           <Button variant="outline" onClick={() => navigateRef.current('/jobs/active')}>
//             <ArrowLeft className="w-4 h-4 mr-2" /> Back to Jobs
//           </Button>
//         </Card>
//       </div>
//     )
//   }

//   const statusBadgeClass = {
//     in_progress: 'bg-green-100 text-green-800',
//     escrow_funded: 'bg-blue-100 text-blue-800',
//     accepted: 'bg-teal-100 text-teal-800',
//     pending: 'bg-yellow-100 text-yellow-800',
//   }[job?.status] || 'bg-gray-100 text-gray-800'

//   // ── Main render ──────────────────────────────────────────────────────────
//   return (
//     <div className="min-h-screen bg-background flex flex-col">
//       {/* Header */}
//       <header className="border-b sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
//         <div className="container mx-auto px-4 py-3 flex items-center gap-3">
//           {/* Back button */}
//           <Button
//             variant="ghost" size="icon"
//             onClick={() => navigateRef.current('/jobs/active')}
//             className="flex-shrink-0"
//           >
//             <ArrowLeft className="w-5 h-5" />
//           </Button>

//           {/* Other user avatar */}
//           {otherUser && (
//             <Avatar className="h-9 w-9 flex-shrink-0">
//               <AvatarImage src={otherUser.avatar || otherUser.profilePicture} alt={otherUser.fullName} />
//               <AvatarFallback className="text-xs bg-primary/10">
//                 {otherUser.fullName?.split(' ')?.map(n => n?.[0])?.join('')?.toUpperCase() || '?'}
//               </AvatarFallback>
//             </Avatar>
//           )}

//           {/* Job title + other user name */}
//           <div className="flex-1 min-w-0">
//             <p className="font-semibold text-sm leading-tight truncate">{job?.title}</p>
//             {otherUser && (
//               <p className="text-xs text-muted-foreground truncate">{otherUser.fullName}</p>
//             )}
//           </div>

//           {/* Status badge */}
//           {job && (
//             <Badge variant="secondary" className={`whitespace-nowrap text-xs flex-shrink-0 ${statusBadgeClass}`}>
//               {getDisplayStatus(job.status)}
//             </Badge>
//           )}
//         </div>

//         {/* Job meta strip */}
//         {job && (
//           <div className="border-t bg-muted/30">
//             <div className="container mx-auto px-4 py-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
//               <div className="flex items-center gap-1">
//                 <DollarSign className="w-3 h-3" />
//                 <span className="font-medium text-foreground">{job.budget} {job.currency || 'USD'}</span>
//               </div>
//               {job.estimatedDuration?.value && (
//                 <div className="flex items-center gap-1">
//                   <Clock className="w-3 h-3" />
//                   <span>{job.estimatedDuration.value} {job.estimatedDuration.unit}</span>
//                 </div>
//               )}
//             </div>
//           </div>
//         )}
//       </header>

//       {/* Messages */}
//       <main className="flex-1 container mx-auto px-4 py-4 flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 130px)' }}>
//         <ScrollArea className="flex-1 border rounded-lg bg-secondary/20 p-4 mb-4">
//           {isLoadingMessages ? (
//             <div className="flex items-center justify-center py-12">
//               <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
//             </div>
//           ) : messages.length === 0 ? (
//             <div className="text-center py-16 text-muted-foreground">
//               <p className="text-sm">No messages yet</p>
//               <p className="text-xs mt-1">Start the conversation to coordinate your work</p>
//             </div>
//           ) : (
//             <div className="space-y-4">
//               {messages.map((msg) => {
//                 const isOwn =
//                   extractId(msg.sender?._id) === currentUserId ||
//                   extractId(msg.sender?.id) === currentUserId ||
//                   msg.senderId === currentUserId
//                 const isDeleted = !!msg.deletedAt
//                 const sender = msg.sender || { fullName: 'Unknown', avatar: null }
//                 const msgId = extractId(msg._id) || extractId(msg.id)

//                 return (
//                   <div
//                     key={msgId}
//                     className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
//                     onMouseEnter={() => setHoveredMessageId(msgId)}
//                     onMouseLeave={() => setHoveredMessageId(null)}
//                   >
//                     {!isOwn && (
//                       <Avatar className="h-8 w-8 mt-0.5 flex-shrink-0">
//                         <AvatarImage src={sender.avatar || sender.profilePicture} />
//                         <AvatarFallback className="text-xs">
//                           {sender.fullName?.split(' ')?.map(n => n?.[0])?.join('')?.toUpperCase() || '?'}
//                         </AvatarFallback>
//                       </Avatar>
//                     )}

//                     <div className={`flex flex-col gap-1 max-w-[85%] sm:max-w-xs ${isOwn ? 'items-end' : 'items-start'}`}>
//                       {!isOwn && !isDeleted && (
//                         <p className="text-[10px] font-medium text-muted-foreground px-1">{sender.fullName}</p>
//                       )}

//                       {editingMessageId === msgId ? (
//                         <div className="flex flex-col gap-1.5 w-full">
//                           <Textarea
//                             value={editingText}
//                             onChange={e => setEditingText(e.target.value)}
//                             className="resize-none min-h-[60px] text-sm"
//                             autoFocus
//                             disabled={isSending}
//                           />
//                           <div className="flex gap-1 justify-end">
//                             <Button
//                               size="sm" className="h-7 px-2 text-xs"
//                               onClick={() => handleEditMessage(msgId)}
//                               disabled={!editingText.trim() || isSending}
//                             >
//                               <Check className="w-3 h-3 mr-1" /> Save
//                             </Button>
//                             <Button
//                               size="sm" variant="outline" className="h-7 px-2 text-xs"
//                               onClick={() => { setEditingMessageId(null); setEditingText('') }}
//                               disabled={isSending}
//                             >
//                               <X className="w-3 h-3" />
//                             </Button>
//                           </div>
//                         </div>
//                       ) : (
//                         <div className={`rounded-lg px-3.5 py-2.5 text-sm break-words ${isDeleted
//                           ? 'bg-muted text-muted-foreground italic'
//                           : isOwn
//                             ? 'bg-primary text-primary-foreground'
//                             : 'bg-muted text-foreground'
//                           }`}>
//                           <p>{isDeleted ? 'This message was deleted' : (msg.content || msg.text)}</p>
//                         </div>
//                       )}

//                       <div className="flex items-center gap-2 text-[10px] text-muted-foreground px-1">
//                         <span>{format(new Date(msg.createdAt), 'HH:mm')}</span>
//                         {isOwn && msg.readBy?.length > 0 && <CheckCheck className="w-3 h-3 text-blue-500" />}
//                       </div>

//                       {hoveredMessageId === msgId && !isDeleted && isOwn && !editingMessageId && (
//                         <div className="flex gap-0.5 mt-0.5">
//                           <Button
//                             variant="ghost" size="sm"
//                             className="h-6 px-2 text-[10px] hover:bg-muted"
//                             onClick={() => { setEditingMessageId(msgId); setEditingText(msg.content || msg.text) }}
//                           >
//                             Edit
//                           </Button>
//                           <Button
//                             variant="ghost" size="sm"
//                             className="h-6 px-2 text-[10px] text-red-500 hover:text-red-600"
//                             onClick={() => handleDeleteMessage(msgId)}
//                           >
//                             <Trash2 className="w-3 h-3" />
//                           </Button>
//                           <Button
//                             variant="ghost" size="sm"
//                             className="h-6 px-2 text-[10px] hover:bg-muted"
//                             onClick={() => setReplyingTo(msg)}
//                           >
//                             <Copy className="w-3 h-3" />
//                           </Button>
//                         </div>
//                       )}
//                     </div>

//                     {isOwn && (
//                       <Avatar className="h-8 w-8 mt-0.5 flex-shrink-0">
//                         <AvatarImage src={currentUser?.avatar || currentUser?.profilePicture} />
//                         <AvatarFallback className="text-xs">
//                           {currentUser?.fullName?.split(' ')?.map(n => n?.[0])?.join('')?.toUpperCase() || '?'}
//                         </AvatarFallback>
//                       </Avatar>
//                     )}
//                   </div>
//                 )
//               })}
//               <div ref={scrollRef} className="h-1" />
//             </div>
//           )}
//         </ScrollArea>

//         {/* Input area */}
//         <div className="space-y-2 flex-shrink-0">
//           {replyingTo && (
//             <div className="flex items-center justify-between bg-secondary/50 p-2.5 rounded-lg text-sm border">
//               <div className="flex-1 min-w-0">
//                 <p className="text-[10px] text-muted-foreground font-medium">
//                   Replying to {replyingTo.sender?.fullName || 'User'}
//                 </p>
//                 <p className="text-sm truncate text-muted-foreground/80">
//                   {replyingTo.content || replyingTo.text}
//                 </p>
//               </div>
//               <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)} className="h-6 w-6 p-0 flex-shrink-0">
//                 <X className="w-3.5 h-3.5" />
//               </Button>
//             </div>
//           )}

//           <div className="flex gap-2 items-end">
//             <Textarea
//               placeholder={
//                 !isChatAllowed
//                   ? 'Chat not available for this job status'
//                   : 'Type your message… (Ctrl+Enter to send)'
//               }
//               value={messageInput}
//               onChange={e => setMessageInput(e.target.value)}
//               onKeyDown={handleKeyDown}
//               className="resize-none min-h-[80px] max-h-[120px]"
//               disabled={isSending || !isChatAllowed}
//             />
//             <Button
//               onClick={handleSendMessage}
//               size="icon"
//               disabled={!messageInput.trim() || isSending || !isChatAllowed}
//               className="mt-auto h-10 w-10 flex-shrink-0"
//             >
//               {isSending
//                 ? <Loader2 className="animate-spin h-4 w-4" />
//                 : <Send className="h-4 w-4" />}
//             </Button>
//           </div>

//           {!isChatAllowed && job && (
//             <p className="text-[10px] text-muted-foreground text-center py-1 bg-muted/30 rounded">
//               {job.status === 'completed'
//                 ? '✓ Job completed — chat is archived'
//                 : job.status === 'pending'
//                   ? '⏳ Awaiting acceptance before chat opens'
//                   : '💬 Chat available once the job is active'}
//             </p>
//           )}
//         </div>
//       </main>
//     </div>
//   )
// }