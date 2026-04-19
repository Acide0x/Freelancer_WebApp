import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Heart,
  MessageCircle,
  Eye,
  Pin,
  X,
  Flag,
  ArrowLeft,
  Loader2,
  Edit,
  Trash2,
  CornerDownRight,
  ZoomIn
} from 'lucide-react'
import api from '../api/api'
import { toast } from 'sonner'

// ✅ OPTIMIZED: Cloudinary URL helper (same as DiscussionForum)
const getOptimizedImageUrl = (url, width = 1200, height = 800) => {
  if (!url || typeof url !== 'string') return ''
  if (url.includes('upload/') && (url.includes('w=') || url.includes('width='))) return url
  if (url.includes('res.cloudinary.com')) {
    const baseUrl = url.split('?')[0]
    return `${baseUrl}?w=${width}&h=${height}&fit=crop&q=auto&f=auto`
  }
  return url
}

// Utility functions
const getInitials = (name) => {
  return name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U'
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (days > 7) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  return 'now'
}

const getCategoryColor = (category) => {
  const colors = {
    General: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    'Job Advice': 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
    Technical: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    Showcase: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    Feedback: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800',
    Collaboration: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800',
    Hiring: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
  }
  return colors[category] || 'bg-gray-500/10 text-gray-700 dark:text-gray-400'
}

// Report Modal Component
function ReportModal({ isOpen, onClose, onSubmit, itemType }) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const reasons = [
    'Spam',
    'Harassment or bullying',
    'Hate speech or discrimination',
    'Misleading information',
    'Inappropriate content',
    'Self-promotion',
  ]

  const handleSubmit = async () => {
    if (!reason.trim()) return
    setIsSubmitting(true)
    try {
      await onSubmit(reason)
      setReason('')
      toast.success(`${itemType} reported successfully`)
      onClose()
    } catch (error) {
      toast.error('Failed to submit report')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">Report {itemType}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Help us understand what's wrong with this {itemType.toLowerCase()}
          </p>

          <div className="space-y-2 mb-6">
            {reasons.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                disabled={isSubmitting}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors disabled:opacity-50 ${
                  reason === r
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border hover:border-primary/50 text-muted-foreground'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!reason.trim() || isSubmitting}
              className="flex-1 px-4 py-2 bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Report
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}

// Image Lightbox Component
function ImageLightbox({ images, currentIndex, onClose, onNavigate }) {
  if (!images?.length) return null

  const handlePrev = (e) => {
    e.stopPropagation()
    const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1
    onNavigate(newIndex)
  }

  const handleNext = (e) => {
    e.stopPropagation()
    const newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1
    onNavigate(newIndex)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-5xl w-full h-full max-h-[90vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 z-50 p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors">
          <X className="w-6 h-6 text-white" />
        </button>
        
        {images.length > 1 && (
          <div className="absolute top-4 left-4 bg-black/40 text-white px-3 py-1 rounded-full text-sm font-medium">
            {currentIndex + 1} / {images.length}
          </div>
        )}
        
        <img
          src={getOptimizedImageUrl(images[currentIndex], 1600, 1200)}
          alt={`Image ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain rounded-lg"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = 'https://via.placeholder.com/1600x1200?text=Image+unavailable'
            e.currentTarget.onerror = null
          }}
        />
        
        {images.length > 1 && (
          <>
            <button onClick={handlePrev} className="absolute left-4 p-3 bg-black/40 hover:bg-black/60 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <button onClick={handleNext} className="absolute right-4 p-3 bg-black/40 hover:bg-black/60 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6 text-white rotate-180" />
            </button>
          </>
        )}
        
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 flex-wrap justify-center max-w-lg">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.stopPropagation(); onNavigate(idx) }}
                className={`relative w-14 h-14 rounded-md overflow-hidden border-2 transition-all ${
                  currentIndex === idx ? 'border-primary scale-105' : 'border-white/20 hover:border-white/40'
                }`}
              >
                <img
                  src={getOptimizedImageUrl(img, 100, 100)}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/100x100?text=Image'
                    e.currentTarget.onerror = null
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Comment Reply Component (nested reply)
function CommentReply({ reply, currentUserId, onReplyUpdate, onReplyDelete }) {
  const [isLiked, setIsLiked] = useState(reply.isLiked || false)
  const [likeCount, setLikeCount] = useState(reply.likeCount || 0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleLike = async () => {
    try {
      const response = await api.post(`/comments/${reply._id}/like`)
      setIsLiked(response.data.status === 'liked')
      setLikeCount(response.data.likeCount)
    } catch (error) {
      toast.error('Failed to update like')
    }
  }

  const isOwnReply = reply.author?._id === currentUserId

  return (
    <div className="bg-muted/30 border border-border rounded-lg p-3 ml-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={reply.author?.avatar} />
            <AvatarFallback>{getInitials(reply.author?.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground">{reply.author?.fullName || 'Unknown'}</p>
            <p className="text-xs text-muted-foreground">{formatDate(reply.createdAt)}</p>
          </div>
        </div>
        {isOwnReply && (
          <button
            onClick={async () => {
              if (!window.confirm('Delete this reply?')) return
              setIsSubmitting(true)
              try {
                await api.delete(`/comments/${reply._id}`)
                onReplyDelete(reply._id)
                toast.success('Reply deleted')
              } catch (error) {
                toast.error('Failed to delete reply')
              } finally {
                setIsSubmitting(false)
              }
            }}
            disabled={isSubmitting}
            className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
      <p className="text-sm text-foreground mb-2">{reply.content}</p>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <button onClick={handleLike} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
          <Heart className="w-3 h-3" fill={isLiked ? 'currentColor' : 'none'} color={isLiked ? '#ef4444' : 'currentColor'} />
          <span>{likeCount}</span>
        </button>
      </div>
    </div>
  )
}

// Comment Item Component (with nested replies support)
function CommentItem({ comment, currentUserId, discussionId, onCommentUpdate, onCommentDelete, onReplyAdded }) {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [showReplies, setShowReplies] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(comment.content)
  const [replyContent, setReplyContent] = useState('')
  const [isLiked, setIsLiked] = useState(comment.isLiked || false)
  const [likeCount, setLikeCount] = useState(comment.likeCount || 0)
  const [reportModal, setReportModal] = useState({ isOpen: false })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [replies, setReplies] = useState(comment.replies || [])

  const isOwnComment = comment.author?._id === currentUserId
  const canReply = comment.level < 5

  const handleLike = async () => {
    try {
      const response = await api.post(`/comments/${comment._id}/like`)
      setIsLiked(response.data.status === 'liked')
      setLikeCount(response.data.likeCount)
    } catch (error) {
      toast.error('Failed to update like')
    }
  }

  const handleEditSubmit = async () => {
    if (!editedContent.trim()) return
    setIsSubmitting(true)
    try {
      const response = await api.patch(`/comments/${comment._id}`, { content: editedContent })
      onCommentUpdate(comment._id, editedContent)
      setIsEditing(false)
      toast.success('Comment updated')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this comment?')) return
    setIsSubmitting(true)
    try {
      await api.delete(`/comments/${comment._id}`)
      onCommentDelete(comment._id)
      toast.success('Comment deleted')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReplySubmit = async () => {
    if (!replyContent.trim()) return
    setIsSubmitting(true)
    try {
      const response = await api.post('/comments', {
        discussionId,
        content: replyContent.trim(),
        parentCommentId: comment._id
      })
      
      if (response.data.success && response.data.populated) {
        const newReply = response.data.populated
        setReplies((prev) => [...prev, newReply])
        if (onReplyAdded) onReplyAdded(comment._id, newReply)
        setReplyContent('')
        setShowReplyForm(false)
        toast.success('Reply posted')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to post reply')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReport = async (reason) => {
    toast.info('Report feature coming soon')
  }

  const handleReplyDelete = (replyId) => {
    setReplies((prev) => prev.filter((r) => r._id !== replyId))
  }

  return (
    <div className="space-y-3">
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-9 w-9 flex-shrink-0">
              <AvatarImage src={comment.author?.avatar} />
              <AvatarFallback>{getInitials(comment.author?.fullName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-foreground">{comment.author?.fullName || 'Unknown'}</p>
                {comment.author?.providerDetails?.isVerified && (
                  <Badge variant="secondary" className="text-xs">✓ Verified</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDate(comment.createdAt)}
                {comment.edited && <span className="ml-1 italic">(edited)</span>}
              </p>
            </div>
          </div>
          {isOwnComment && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setIsEditing(!isEditing)}
                disabled={isSubmitting}
                className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <Edit className="w-3 h-3" /> Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-2 py-1 text-xs text-destructive hover:bg-destructive/10 rounded transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
              disabled={isSubmitting}
            />
            <div className="flex gap-2">
              <button
                onClick={handleEditSubmit}
                disabled={isSubmitting}
                className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Save
              </button>
              <button
                onClick={() => { setIsEditing(false); setEditedContent(comment.content) }}
                disabled={isSubmitting}
                className="px-3 py-1 text-sm border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground mb-3 whitespace-pre-wrap">{comment.content}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <button onClick={handleLike} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
            <Heart className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} color={isLiked ? '#ef4444' : 'currentColor'} />
            <span>{likeCount}</span>
          </button>
          {canReply && (
            <button 
              onClick={() => setShowReplyForm(!showReplyForm)} 
              disabled={isSubmitting}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors disabled:opacity-50"
            >
              <MessageCircle className="w-4 h-4" /> Reply
            </button>
          )}
          {!canReply && <span className="text-xs text-muted-foreground">Max replies reached</span>}
          {!isOwnComment && (
            <button onClick={() => setReportModal({ isOpen: true })} className="flex items-center gap-1.5 hover:text-destructive transition-colors ml-auto">
              <Flag className="w-4 h-4" /> Report
            </button>
          )}
        </div>
      </div>

      {showReplyForm && (
        <div className="ml-6 space-y-2">
          <div className="flex items-start gap-2">
            <CornerDownRight className="w-4 h-4 text-muted-foreground mt-2 flex-shrink-0" />
            <div className="flex-1">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                rows={2}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div className="flex gap-2 ml-6">
            <button 
              onClick={handleReplySubmit} 
              disabled={!replyContent.trim() || isSubmitting} 
              className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Reply
            </button>
            <button 
              onClick={() => { setShowReplyForm(false); setReplyContent('') }} 
              disabled={isSubmitting}
              className="px-3 py-1 text-sm border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {replies.length > 0 && (
        <div className="ml-6 space-y-3">
          <button 
            onClick={() => setShowReplies(!showReplies)} 
            className="text-sm text-primary hover:text-primary/90 transition-colors flex items-center gap-1"
          >
            {showReplies ? '−' : '+'} {replies.length} repl{replies.length !== 1 ? 'ies' : 'y'}
          </button>
          {showReplies && (
            <div className="space-y-3">
              {replies.map((reply) => (
                <CommentReply 
                  key={reply._id} 
                  reply={reply} 
                  currentUserId={currentUserId}
                  onReplyUpdate={() => {}}
                  onReplyDelete={handleReplyDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <ReportModal isOpen={reportModal.isOpen} onClose={() => setReportModal({ isOpen: false })} onSubmit={handleReport} itemType="Comment" />
    </div>
  )
}

// ✅ Main Discussion Detail Page - FIXED
export default function DiscussionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [discussion, setDiscussion] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true) // ✅ Loading state
  const [error, setError] = useState(null) // ✅ Error state
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [reportModal, setReportModal] = useState({ isOpen: false })
  const [pagination, setPagination] = useState({})
  
  // ✅ Image lightbox state
  const [lightboxImages, setLightboxImages] = useState([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [showLightbox, setShowLightbox] = useState(false)

  // Get current user ID from auth
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setCurrentUserId(payload.userId || payload._id || payload.id)
      } catch (e) {
        api.get('/auth/me').then((res) => setCurrentUserId(res.data.user?._id)).catch(() => {})
      }
    }
  }, [])

  // ✅ Fetch discussion from backend - FIXED LOADING
  useEffect(() => {
    const fetchDiscussion = async () => {
      if (!id) {
        setLoading(false)
        setError('No discussion ID provided')
        return
      }
      
      try {
        setLoading(true)
        setError(null)
        const response = await api.get(`/discussions/${id}`)
        
        if (response.data?.success && response.data?.discussion) {
          setDiscussion(response.data.discussion)
        } else {
          throw new Error('Invalid response format')
        }
      } catch (error) {
        console.error('Failed to fetch discussion:', error)
        setError(error.message || 'Failed to load discussion')
        if (error.response?.status === 404) {
          toast.error('Discussion not found')
          setTimeout(() => navigate('/discussions'), 1500)
        } else {
          toast.error('Failed to load discussion')
        }
      } finally {
        setLoading(false) // ✅ Always set loading to false
      }
    }
    
    fetchDiscussion()
  }, [id, navigate])

  // ✅ Fetch comments from backend
  const fetchComments = async (parentId = null) => {
    if (!id) return []
    try {
      const params = { discussionId: id }
      if (parentId) params.parentId = parentId
      
      const response = await api.get('/comments', { params })
      if (response.data?.success) {
        if (parentId) {
          return response.data.comments || []
        }
        setComments(response.data.comments || [])
        setPagination(response.data.pagination || {})
      }
      return response.data?.comments || []
    } catch (error) {
      console.error('Failed to fetch comments:', error)
      return []
    }
  }

  // Load top-level comments when discussion loads
  useEffect(() => {
    if (discussion?._id) {
      fetchComments()
    }
  }, [discussion])

  const handleAddComment = async () => {
    if (!newComment.trim() || !discussion) return
    setIsSubmitting(true)
    try {
      const response = await api.post('/comments', {
        discussionId: discussion._id,
        content: newComment.trim(),
        parentCommentId: null
      })
      
      if (response.data?.success && response.data?.populated) {
        const newCommentObj = response.data.populated
        setComments((prev) => [newCommentObj, ...prev])
        setNewComment('')
        toast.success('Comment posted')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to post comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCommentUpdate = (commentId, newContent) => {
    setComments((prev) => prev.map((c) => (c._id === commentId ? { ...c, content: newContent, edited: true } : c)))
  }

  const handleCommentDelete = (commentId) => {
    setComments((prev) => prev.filter((c) => c._id !== commentId))
  }

  const handleReplyAdded = (parentCommentId, newReply) => {
    setComments((prev) =>
      prev.map((c) =>
        c._id === parentCommentId
          ? { ...c, replies: [...(c.replies || []), newReply] }
          : c
      )
    )
  }

  const handleLikeDiscussion = async () => {
    if (!discussion) return
    try {
      const response = await api.post(`/discussions/${discussion._id}/like`)
      setDiscussion((prev) => ({ 
        ...prev, 
        isLiked: response.data.status === 'liked', 
        likeCount: response.data.likeCount 
      }))
    } catch (error) {
      toast.error('Failed to update like')
    }
  }

  const handleReportDiscussion = async (reason) => {
    toast.info('Report feature coming soon')
  }

  const handleDeleteDiscussion = async () => {
    if (!window.confirm('Delete this discussion?')) return
    setIsSubmitting(true)
    try {
      await api.delete(`/discussions/${discussion._id}`)
      toast.success('Discussion deleted')
      navigate('/discussions')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete discussion')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ✅ Handle image click to open lightbox
  const handleImageClick = (images, index = 0) => {
    if (!images?.length) return
    setLightboxImages(images)
    setLightboxIndex(index)
    setShowLightbox(true)
  }

  // ✅ Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading discussion...</p>
        </div>
      </main>
    )
  }

  // ✅ Error state
  if (error || !discussion) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <p className="text-destructive font-medium mb-4">{error || 'Discussion not found'}</p>
          <Button onClick={() => navigate('/discussions')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Forum
          </Button>
        </div>
      </main>
    )
  }

  const isOwner = discussion.author?._id === currentUserId
  const isAdmin = localStorage.getItem('userRole') === 'admin'

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card/95 border-b border-border backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link to="/discussions" className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Forum
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <article className="bg-card border border-border rounded-lg p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={discussion.author?.avatar} />
              <AvatarFallback>{getInitials(discussion.author?.fullName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{discussion.author?.fullName || 'Unknown'}</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(discussion.createdAt)} in <span className="font-medium">{discussion.category}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {discussion.isPinned && <Pin className="w-5 h-5 text-amber-500" fill="currentColor" title="Pinned" />}
              {(isOwner || isAdmin) && (
                <button onClick={handleDeleteDiscussion} disabled={isSubmitting} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50" title="Delete discussion">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              {!isOwner && (
                <button onClick={() => setReportModal({ isOpen: true })} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors" title="Report discussion">
                  <Flag className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-4">{discussion.title}</h1>
          <p className="text-foreground mb-6 leading-relaxed whitespace-pre-wrap">{discussion.content}</p>

          {/* ✅ FIXED: Images with optimized URLs and click-to-zoom */}
          {discussion.images?.length > 0 && (
            <div className="mb-6 grid gap-4">
              {discussion.images.length === 1 ? (
                <button 
                  onClick={() => handleImageClick(discussion.images, 0)}
                  className="relative group overflow-hidden rounded-lg bg-muted hover:opacity-90 transition-opacity w-full"
                >
                  <img 
                    src={getOptimizedImageUrl(discussion.images[0], 1200, 800)} 
                    alt="Post content" 
                    className="w-full max-h-96 object-cover rounded-lg"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/1200x800?text=Image+unavailable'
                      e.currentTarget.onerror = null
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {discussion.images.map((img, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handleImageClick(discussion.images, idx)}
                      className="relative group overflow-hidden rounded-lg bg-muted hover:opacity-90 transition-opacity"
                    >
                      <img 
                        src={getOptimizedImageUrl(img, 600, 400)} 
                        alt={`Post content ${idx + 1}`} 
                        className="w-full max-h-72 object-cover rounded-lg"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/600x400?text=Image+unavailable'
                          e.currentTarget.onerror = null
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {discussion.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {discussion.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}

          <div className="border-t border-border pt-4 flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2"><Eye className="w-4 h-4" /><span>{discussion.viewCount || 0} views</span></div>
              <button onClick={handleLikeDiscussion} className="flex items-center gap-2 hover:text-foreground transition-colors">
                <Heart className="w-4 h-4" fill={discussion.isLiked ? 'currentColor' : 'none'} color={discussion.isLiked ? '#ef4444' : 'currentColor'} />
                <span>{discussion.likeCount || 0} likes</span>
              </button>
              <div className="flex items-center gap-2"><MessageCircle className="w-4 h-4" /><span>{comments.length} comments</span></div>
            </div>
            {discussion.isClosed && <Badge variant="destructive" className="text-xs">Closed</Badge>}
          </div>
        </article>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Comments ({comments.length})</h2>

          {/* Add Comment Form */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-start gap-3 mb-3">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarFallback>You</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground mb-2">Add a comment</p>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                  rows={3}
                  disabled={isSubmitting || discussion.isClosed}
                />
                {discussion.isClosed && <p className="text-xs text-muted-foreground mt-1">This discussion is closed for new comments</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setNewComment('')} disabled={isSubmitting} className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors text-sm font-medium disabled:opacity-50">Cancel</button>
              <button onClick={handleAddComment} disabled={!newComment.trim() || isSubmitting || discussion.isClosed} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Comment
              </button>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
              </div>
            ) : (
              comments.map((comment) => (
                <CommentItem
                  key={comment._id}
                  comment={comment}
                  currentUserId={currentUserId}
                  discussionId={discussion._id}
                  onCommentUpdate={handleCommentUpdate}
                  onCommentDelete={handleCommentDelete}
                  onReplyAdded={handleReplyAdded}
                />
              ))
            )}
          </div>

          {/* Pagination */}
          {pagination?.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasPrev}
                onClick={() => toast.info('Load more comments coming soon')}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.hasNext}
                onClick={() => toast.info('Load more comments coming soon')}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ✅ Image Lightbox */}
      {showLightbox && (
        <ImageLightbox 
          images={lightboxImages} 
          currentIndex={lightboxIndex} 
          onClose={() => setShowLightbox(false)}
          onNavigate={setLightboxIndex}
        />
      )}

      <ReportModal isOpen={reportModal.isOpen} onClose={() => setReportModal({ isOpen: false })} onSubmit={handleReportDiscussion} itemType="Discussion" />
    </main>
  )
}