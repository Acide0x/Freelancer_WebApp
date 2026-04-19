import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom' // ✅ Added for navigation
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Heart,
  MessageCircle,
  Eye,
  Pin,
  List,
  LayoutGrid,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Upload,
  Trash2,
  Loader2
} from 'lucide-react'
import api from '../api/api'
import { toast } from 'sonner'

// ✅ Cloudinary Config (Frontend - Unsigned Preset Only)
const CLOUDINARY_CONFIG = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
  uploadUrl: `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
}

// ✅ Upload single image to Cloudinary (unsigned)
const uploadImageToCloudinary = async (file, onProgress) => {
  if (!CLOUDINARY_CONFIG.cloudName || CLOUDINARY_CONFIG.cloudName === 'undefined') {
    throw new Error('Cloudinary cloud name not configured. Check your .env file.')
  }
  if (!CLOUDINARY_CONFIG.uploadPreset || CLOUDINARY_CONFIG.uploadPreset === 'undefined') {
    throw new Error('Cloudinary upload preset not configured. Check your .env file.')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset)
  formData.append('folder', 'forum/discussions')

  const xhr = new XMLHttpRequest()
  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded * 100) / e.total)
        onProgress(percent)
      }
    })

    xhr.addEventListener('load', () => {
      try {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText)
          resolve({
            url: data.secure_url,
            publicId: data.public_id,
            thumbnail: `${data.secure_url}?w=400&h=300&fit=crop&q=auto`,
          })
        } else {
          const errorData = JSON.parse(xhr.responseText)
          reject(new Error(errorData.error?.message || 'Upload failed'))
        }
      } catch (e) {
        reject(new Error(`Invalid response: ${xhr.responseText}`))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
    xhr.open('POST', CLOUDINARY_CONFIG.uploadUrl)
    xhr.send(formData)
  })
}

// Constants
const CATEGORIES = [
  'General', 'Job Advice', 'Technical', 'Showcase', 'Feedback', 'Collaboration', 'Hiring',
]

const ALL_TAGS = [
  'react', 'hooks', 'best-practices', 'websockets', 'collaboration', 'project',
  'design-system', 'ui', 'feedback', 'jobs', 'hiring', 'opportunities',
  'startup', 'frontend', 'career', 'transition', 'advice',
]

// ✅ BULLETPROOF: Normalize discussion data from API
const normalizeDiscussion = (disc) => {
  if (!disc) return null

  // Unwrap common backend response structures
  const raw = disc.discussion || disc.data || disc.newDiscussion || disc

  // Handle nested author safely
  const authorData = raw.author?.userId || raw.author?.user || raw.author || {}
  const author = {
    fullName: authorData.fullName || authorData.name || authorData.username || 'Unknown',
    avatar: authorData.avatar || authorData.profilePicture || authorData.image || '',
    _id: authorData._id || authorData.id,
  }

  // Handle images (strings or objects)
  const rawImages = Array.isArray(raw.images) ? raw.images : []
  const images = rawImages
    .map(img => {
      if (typeof img === 'string') return img
      if (img && typeof img === 'object') return img.url || img.secure_url || img.image || img.src || ''
      return ''
    })
    .filter(Boolean)

  return {
    _id: raw._id || raw.id || disc._id || disc.id || null,
    title: raw.title || '',
    content: raw.content || raw.description || '',
    author,
    category: raw.category || 'General',
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    likeCount: typeof raw.likeCount === 'number' ? raw.likeCount : raw.likes?.length || 0,
    viewCount: raw.viewCount || 0,
    commentCount: raw.commentCount || raw.comments?.length || 0,
    isClosed: !!raw.isClosed,
    isPinned: !!raw.isPinned,
    isLiked: !!raw.isLiked,
    createdAt: raw.createdAt || new Date().toISOString(),
    images,
  }
}

// Utility functions
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

const getInitials = (name) => name?.split(' ').map((n) => n[0]).join('').toUpperCase() || 'U'

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (days > 7) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  return 'now'
}

// ✅ OPTIMIZED: Cloudinary URL helper
const getOptimizedImageUrl = (url, width = 800, height = 600) => {
  if (!url || typeof url !== 'string') return ''
  if (url.includes('upload/') && (url.includes('w=') || url.includes('width='))) return url
  if (url.includes('res.cloudinary.com')) {
    const baseUrl = url.split('?')[0]
    return `${baseUrl}?w=${width}&h=${height}&fit=crop&q=auto&f=auto`
  }
  return url
}

// Grid Card Component - ✅ CLICKABLE
function DiscussionCard({ discussion, onImageClick, onNavigate }) {
  if (!discussion?._id) return null

  const [isLiked, setIsLiked] = useState(discussion.isLiked || false)
  const [likeCount, setLikeCount] = useState(discussion.likeCount || 0)
  const [isLiking, setIsLiking] = useState(false)

  const handleLike = async (e) => {
    e.stopPropagation() // ✅ Prevent card navigation when liking
    if (isLiking) return
    setIsLiking(true)
    const previousLiked = isLiked
    const previousCount = likeCount
    setIsLiked(!isLiked)
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1)
    try {
      const response = await api.post(`/discussions/${discussion._id}/like`)
      setIsLiked(response.data.status === 'liked')
      setLikeCount(response.data.likeCount)
    } catch (error) {
      setIsLiked(previousLiked)
      setLikeCount(previousCount)
      if (error.response?.status === 401) toast.error('Please log in to like discussions')
      else toast.error('Failed to update like')
    } finally {
      setIsLiking(false)
    }
  }

  const handleCardClick = () => {
    if (onNavigate) onNavigate(discussion._id)
  }

  const handleImageClickWrapper = (e, images, index) => {
    e.stopPropagation() // ✅ Prevent card navigation when clicking image
    if (onImageClick) onImageClick(images, index)
  }

  return (
    <article 
      onClick={handleCardClick}
      className="group bg-card border border-border hover:border-primary/50 rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md flex flex-col h-full cursor-pointer"
    >
      <div className="p-4 border-b border-border/50 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={discussion.author?.avatar} />
            <AvatarFallback>{getInitials(discussion.author?.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-foreground">{discussion.author?.fullName || 'Unknown'}</p>
            <p className="text-xs text-muted-foreground">{formatDate(discussion.createdAt)}</p>
          </div>
        </div>
        {discussion.isPinned && <Pin className="w-4 h-4 text-amber-500 flex-shrink-0" fill="currentColor" />}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-base font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">{discussion.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-3 flex-1 mb-3">{discussion.content}</p>

        {discussion.images?.length > 0 && (
          <div className="mb-3 grid gap-2">
            {discussion.images.length === 1 ? (
              <button 
                onClick={(e) => handleImageClickWrapper(e, discussion.images, 0)} 
                className="relative group/img overflow-hidden rounded-md h-48 bg-muted hover:opacity-90 transition-opacity"
              >
                <img src={getOptimizedImageUrl(discussion.images[0], 800, 600)} alt="Post content" className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/800x600?text=Image+unavailable'; e.currentTarget.onerror = null }} />
                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center"><svg className="w-5 h-5 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg></div>
              </button>
            ) : discussion.images.length === 2 ? (
              <div className="grid grid-cols-2 gap-2">
                {discussion.images.map((img, idx) => (
                  <button 
                    key={idx} 
                    onClick={(e) => handleImageClickWrapper(e, discussion.images, idx)} 
                    className="relative group/img overflow-hidden rounded-md h-24 bg-muted hover:opacity-90 transition-opacity"
                  >
                    <img src={getOptimizedImageUrl(img, 400, 300)} alt={`Post content ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Image+unavailable'; e.currentTarget.onerror = null }} />
                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center"><svg className="w-4 h-4 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg></div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {discussion.images.map((img, idx) => (
                  <button 
                    key={idx} 
                    onClick={(e) => handleImageClickWrapper(e, discussion.images, idx)} 
                    className="relative group/img overflow-hidden rounded-md h-20 bg-muted hover:opacity-90 transition-opacity"
                  >
                    <img src={getOptimizedImageUrl(img, 300, 200)} alt={`Post content ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Image+unavailable'; e.currentTarget.onerror = null }} />
                    {idx === 2 && discussion.images.length > 3 && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><span className="text-white font-semibold text-sm">+{discussion.images.length - 3}</span></div>}
                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center"><svg className="w-3 h-3 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg></div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline" className={`text-xs border ${getCategoryColor(discussion.category)}`}>{discussion.category}</Badge>
          {discussion.tags?.slice(0, 2).map((tag) => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
          {discussion.tags?.length > 2 && <Badge variant="secondary" className="text-xs">+{discussion.tags.length - 2}</Badge>}
        </div>
      </div>
      <div className="px-4 py-3 border-t border-border/50 bg-muted/30 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <button onClick={handleLike} disabled={isLiking} className="flex items-center gap-1.5 hover:text-foreground transition-colors disabled:opacity-50">
            {isLiking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} color={isLiked ? '#ef4444' : 'currentColor'} />}
            <span>{likeCount}</span>
          </button>
          <div className="flex items-center gap-1.5 hover:text-foreground transition-colors"><MessageCircle className="w-4 h-4" /><span>{discussion.commentCount || 0}</span></div>
          <div className="flex items-center gap-1.5 hover:text-foreground transition-colors"><Eye className="w-4 h-4" /><span>{discussion.viewCount || 0}</span></div>
        </div>
        {discussion.isClosed && <span className="text-xs px-2 py-1 bg-muted border border-border rounded text-destructive font-medium">Closed</span>}
      </div>
    </article>
  )
}

// List Item Component - ✅ CLICKABLE
function DiscussionListItem({ discussion, onImageClick, onNavigate }) {
  if (!discussion?._id) return null

  const [isLiked, setIsLiked] = useState(discussion.isLiked || false)
  const [likeCount, setLikeCount] = useState(discussion.likeCount || 0)
  const [isLiking, setIsLiking] = useState(false)

  const handleLike = async (e) => {
    e.stopPropagation() // ✅ Prevent card navigation when liking
    e.preventDefault()
    if (isLiking) return
    setIsLiking(true)
    const previousLiked = isLiked
    const previousCount = likeCount
    setIsLiked(!isLiked)
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1)
    try {
      const response = await api.post(`/discussions/${discussion._id}/like`)
      setIsLiked(response.data.status === 'liked')
      setLikeCount(response.data.likeCount)
    } catch (error) {
      setIsLiked(previousLiked)
      setLikeCount(previousCount)
      if (error.response?.status === 401) toast.error('Please log in to like discussions')
      else toast.error('Failed to update like')
    } finally {
      setIsLiking(false)
    }
  }

  const handleCardClick = () => {
    if (onNavigate) onNavigate(discussion._id)
  }

  const handleImageClickWrapper = (e, images, index) => {
    e.stopPropagation() // ✅ Prevent card navigation when clicking image
    if (onImageClick) onImageClick(images, index)
  }

  return (
    <article 
      onClick={handleCardClick}
      className="group bg-card border border-border hover:border-primary/50 rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md p-4 cursor-pointer"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={discussion.author?.avatar} />
            <AvatarFallback>{getInitials(discussion.author?.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {discussion.isPinned && <Pin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="currentColor" />}
              <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">{discussion.title}</h3>
              {discussion.isClosed && <span className="text-xs px-2 py-0.5 bg-destructive/10 text-destructive rounded font-medium flex-shrink-0">Closed</span>}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{discussion.content}</p>
            <div className="flex items-center flex-wrap gap-2">
              <Badge variant="outline" className={`text-xs border ${getCategoryColor(discussion.category)}`}>{discussion.category}</Badge>
              {discussion.tags?.slice(0, 1).map((tag) => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
              {discussion.tags?.length > 1 && <span className="text-xs text-muted-foreground">+{discussion.tags.length - 1} more</span>}
              <span className="text-xs text-muted-foreground ml-auto sm:ml-0">{discussion.author?.fullName || 'Unknown'} • {formatDate(discussion.createdAt)}</span>
            </div>
          </div>
        </div>

        {discussion.images?.length > 0 && (
          <div className="flex gap-2 ml-12">
            {discussion.images.slice(0, 3).map((img, idx) => (
              <button 
                key={idx} 
                onClick={(e) => handleImageClickWrapper(e, discussion.images, idx)} 
                className="relative group/img overflow-hidden rounded-md w-20 h-20 bg-muted hover:opacity-90 transition-opacity flex-shrink-0"
              >
                <img src={getOptimizedImageUrl(img, 200, 200)} alt={`Post content ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/200x200?text=Image+unavailable'; e.currentTarget.onerror = null }} />
                {idx === 2 && discussion.images.length > 3 && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><span className="text-white font-semibold text-xs">+{discussion.images.length - 3}</span></div>}
                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center"><svg className="w-3 h-3 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg></div>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between sm:justify-end gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-4 order-2 sm:order-none">
            <button onClick={handleLike} disabled={isLiking} className="flex items-center gap-1.5 hover:text-foreground transition-colors disabled:opacity-50">
              {isLiking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} color={isLiked ? '#ef4444' : 'currentColor'} />}
              <span className="hidden sm:inline">{likeCount}</span>
            </button>
            <div className="flex items-center gap-1.5 hover:text-foreground transition-colors"><MessageCircle className="w-4 h-4" /><span className="hidden sm:inline">{discussion.commentCount || 0}</span></div>
            <div className="flex items-center gap-1.5 hover:text-foreground transition-colors"><Eye className="w-4 h-4" /><span className="hidden sm:inline">{discussion.viewCount || 0}</span></div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors order-1 sm:order-none flex-shrink-0" />
        </div>
      </div>
    </article>
  )
}

// Filters Sidebar Component
function ForumFilters({ selectedCategory, onCategoryChange, selectedTags, onTagsChange, sortBy, onSortChange, dateRange, onDateRangeChange, stats }) {
  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) onTagsChange(selectedTags.filter((t) => t !== tag))
    else onTagsChange([...selectedTags, tag])
  }
  const clearFilters = () => { onCategoryChange(null); onTagsChange([]); onSortChange('newest'); onDateRangeChange('all') }
  const hasActiveFilters = selectedCategory !== null || selectedTags.length > 0 || sortBy !== 'newest' || dateRange !== 'all'

  return (
    <div className="space-y-4 sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto">
      {hasActiveFilters && <Button variant="outline" size="sm" onClick={clearFilters} className="w-full text-xs">Clear Filters</Button>}
      <Card className="p-4 border-border">
        <h3 className="font-semibold text-sm mb-3 text-foreground">Sort By</h3>
        <div className="space-y-2">
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-full text-sm h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="popular">Most Views</SelectItem>
              <SelectItem value="liked">Most Liked</SelectItem>
              <SelectItem value="commented">Most Comments</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>
      <Card className="p-4 border-border">
        <h3 className="font-semibold text-sm mb-3 text-foreground">Posted</h3>
        <div className="space-y-2">
          {[{ value: 'all', label: 'Any Time' }, { value: 'day', label: 'This Day' }, { value: 'week', label: 'This Week' }, { value: 'month', label: 'This Month' }, { value: 'year', label: 'This Year' }].map((option) => (
            <button key={option.value} onClick={() => onDateRangeChange(option.value)} className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${dateRange === option.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>{option.label}</button>
          ))}
        </div>
      </Card>
      <Card className="p-4 border-border">
        <h3 className="font-semibold text-sm mb-3 text-foreground">Categories</h3>
        <div className="space-y-2">
          {CATEGORIES.map((category) => (
            <button key={category} onClick={() => onCategoryChange(selectedCategory === category ? null : category)} className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${selectedCategory === category ? `${getCategoryColor(category)} border` : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>{category}</button>
          ))}
        </div>
      </Card>
      <Card className="p-4 border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-foreground">Tags</h3>
          {selectedTags.length > 0 && <span className="text-xs text-muted-foreground">{selectedTags.length} selected</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_TAGS.map((tag) => (
            <button key={tag} onClick={() => toggleTag(tag)} className={`relative px-2 py-1 text-xs rounded-md font-medium transition-all ${selectedTags.includes(tag) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'}`}>{tag}{selectedTags.includes(tag) && <X className="w-3 h-3 ml-1 inline-block" />}</button>
          ))}
        </div>
      </Card>
      <Card className="p-4 border-border bg-muted/30">
        <h3 className="font-semibold text-sm mb-3 text-foreground">Stats</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Total Discussions</span><span className="font-semibold text-foreground">{stats?.total ?? 0}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Active Users</span><span className="font-semibold text-foreground">{stats?.activeUsers ?? 0}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Total Comments</span><span className="font-semibold text-foreground">{stats?.totalComments ?? 0}</span></div>
        </div>
      </Card>
    </div>
  )
}

// ✅ Add Post Modal
function AddPostModal({ isOpen, onClose, onPostCreated, categories, allTags }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [uploadedImages, setUploadedImages] = useState([])
  const [dragActive, setDragActive] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleImageFiles = (files) => {
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024) {
        const reader = new FileReader()
        reader.onload = (e) => {
          if (e.target?.result) {
            setUploadedImages((prev) => [...prev, {
              file,
              preview: e.target.result,
              url: null,
              uploading: false,
              progress: 0,
            }])
          }
        }
        reader.readAsDataURL(file)
      }
    })
  }

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files) handleImageFiles(e.dataTransfer.files)
  }

  const handleInputChange = (e) => {
    if (e.target.files) handleImageFiles(e.target.files)
  }

  const handleRemoveImage = (index) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index))
  }

  const uploadPendingImages = async () => {
    const pending = uploadedImages.filter(img => !img.url && !img.uploading)
    if (pending.length === 0) return uploadedImages

    setUploadedImages(prev => prev.map(img =>
      pending.some(p => p.file === img.file) ? { ...img, uploading: true } : img
    ))

    const results = []
    for (const img of uploadedImages) {
      if (img.url) {
        results.push(img)
      } else if (img.file) {
        try {
          const result = await uploadImageToCloudinary(img.file, (percent) => {
            setUploadedImages(prev => prev.map(i =>
              i.file === img.file ? { ...i, progress: percent } : i
            ))
          })
          results.push({ ...img, url: result.url, thumbnail: result.thumbnail, uploading: false, progress: 100 })
        } catch (error) {
          toast.error(`Failed to upload ${img.file.name}`)
          results.push({ ...img, uploading: false, error: true })
        }
      }
    }
    return results
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !content.trim() || !category) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    try {
      toast.info('Uploading images...')
      const uploaded = await uploadPendingImages()

      const failed = uploaded.filter(img => img.error)
      if (failed.length > 0) {
        throw new Error(`${failed.length} image upload(s) failed`)
      }

      const imageUrls = uploaded.filter(img => img.url).map(img => img.url)

      const payload = {
        title: title.trim(),
        content: content.trim(),
        category,
        tags: selectedTags,
        images: imageUrls,
      }

      const response = await api.post('/discussions', payload)
      toast.success('Discussion created successfully!')

      if (onPostCreated) {
        // Extract discussion object from various response structures
        const newDiscussion = response.data?.discussion || response.data?.data || response.data
        onPostCreated(newDiscussion)
      }

      setTitle(''); setContent(''); setCategory(''); setSelectedTags([]); setUploadedImages([])
      onClose()
    } catch (error) {
      if (error.response?.status === 401) toast.error('Please log in to create discussions')
      else toast.error(error.message || error.response?.data?.message || 'Failed to create discussion.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) setSelectedTags(selectedTags.filter((t) => t !== tag))
    else setSelectedTags([...selectedTags, tag])
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Create New Discussion</h2>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors" disabled={isSubmitting}><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Title <span className="text-destructive">*</span></label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter discussion title" className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" required disabled={isSubmitting} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Description <span className="text-destructive">*</span></label>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Describe your discussion..." rows={5} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" required disabled={isSubmitting} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Category <span className="text-destructive">*</span></label>
              <Select value={category} onValueChange={setCategory} disabled={isSubmitting}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>{categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-3">Tags</label>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <button key={tag} type="button" onClick={() => toggleTag(tag)} disabled={isSubmitting} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors disabled:opacity-50 ${selectedTags.includes(tag) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{tag}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-3">Images</label>
              <div className="space-y-3">
                <div
                  onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${dragActive ? 'border-primary bg-primary/5' : 'border-border bg-muted/30 hover:border-primary/50'} ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <input type="file" multiple accept="image/*" onChange={handleInputChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isSubmitting} />
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Drag images here or click to select</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF up to 10MB each</p>
                    </div>
                  </div>
                </div>

                {uploadedImages.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">{uploadedImages.filter(i => i.url).length}/{uploadedImages.length} uploaded</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {uploadedImages.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img src={img.preview} alt={`Upload ${idx + 1}`} className="w-full h-32 object-cover rounded-lg border border-border" />
                          {img.uploading && !img.url && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-lg">
                              <Loader2 className="w-6 h-6 text-white animate-spin mb-2" />
                              <span className="text-white text-xs">{img.progress}%</span>
                              <div className="w-full px-2 mt-1">
                                <div className="h-1 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${img.progress}%` }} /></div>
                              </div>
                            </div>
                          )}
                          {img.error && <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center rounded-lg"><X className="w-6 h-6 text-white" /></div>}
                          {!img.uploading && (
                            <button type="button" onClick={() => handleRemoveImage(idx)} disabled={isSubmitting} className="absolute top-2 right-2 p-1.5 bg-destructive/90 hover:bg-destructive text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded-md">{idx + 1}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-border">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors font-medium disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={!title.trim() || !content.trim() || !category || isSubmitting || uploadedImages.some(i => i.uploading)} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Discussion'}
              </button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}

// ✅ Main Page Component
export default function DiscussionForum() {
  const navigate = useNavigate() // ✅ Initialize navigate hook
  const [discussions, setDiscussions] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedTags, setSelectedTags] = useState([])
  const [sortBy, setSortBy] = useState('newest')
  const [dateRange, setDateRange] = useState('all')
  const [selectedImage, setSelectedImage] = useState(null)
  const [imageIndex, setImageIndex] = useState(0)
  const [allImages, setAllImages] = useState([])
  const [isAddPostOpen, setIsAddPostOpen] = useState(false)
  const [pagination, setPagination] = useState({})
  const [stats, setStats] = useState({})

  const fetchDiscussions = useCallback(async () => {
    try {
      setLoading(true)
      const params = { page: 1, limit: 20, sortBy }
      if (selectedCategory) params.category = selectedCategory
      if (selectedTags.length > 0) params.tag = selectedTags[0]

      const response = await api.get('/discussions', { params })
      if (response.data.success) {
        const normalized = (response.data.discussions || []).map(normalizeDiscussion).filter(Boolean)
        setDiscussions(normalized)
        setPagination(response.data.pagination || {})
        if (response.data.stats) setStats(response.data.stats)
      }
    } catch (error) {
      if (error.response?.status === 401) toast.error('Please log in to view discussions')
      else toast.error('Failed to load discussions')
      setDiscussions([])
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, selectedTags, sortBy, dateRange])

  useEffect(() => { fetchDiscussions() }, [fetchDiscussions])

  const handleImageClick = (images, index) => { setAllImages(images); setImageIndex(index); setSelectedImage(images[index]) }
  const goToPreviousImage = () => { const newIndex = imageIndex === 0 ? allImages.length - 1 : imageIndex - 1; setImageIndex(newIndex); setSelectedImage(allImages[newIndex]) }
  const goToNextImage = () => { const newIndex = imageIndex === allImages.length - 1 ? 0 : imageIndex + 1; setImageIndex(newIndex); setSelectedImage(allImages[newIndex]) }

  const handlePostCreated = (newDiscussion) => {
    const normalized = normalizeDiscussion(newDiscussion)
    if (!normalized?._id) {
      toast.warning('Post created but failed to display. Refreshing...')
      fetchDiscussions()
      return
    }
    setDiscussions(prev => {
      if (prev.some(d => d._id === normalized._id)) return prev
      return [normalized, ...prev]
    })
    setPagination(prev => ({ ...prev, total: (prev.total || 0) + 1 }))
  }

  // ✅ Navigate to discussion detail page
  const handleNavigateToDiscussion = (discussionId) => {
    navigate(`/discussions/${discussionId}`)
  }

  // Filtering & Sorting
  let filteredDiscussions = discussions.filter((d) => d && d._id)
  if (selectedCategory) filteredDiscussions = filteredDiscussions.filter((d) => d?.category === selectedCategory)
  if (selectedTags.length > 0) filteredDiscussions = filteredDiscussions.filter((d) => d?.tags?.some((tag) => selectedTags.includes(tag)))

  if (dateRange !== 'all') {
    const now = new Date()
    let startDate
    switch (dateRange) {
      case 'day': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break
      case 'week': startDate = new Date(now); startDate.setDate(now.getDate() - 7); break
      case 'month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break
      case 'year': startDate = new Date(now.getFullYear(), 0, 1); break
      default: startDate = new Date(0)
    }
    filteredDiscussions = filteredDiscussions.filter((d) => d?.createdAt && new Date(d.createdAt).getTime() >= startDate.getTime())
  }

  if (sortBy === 'popular') filteredDiscussions.sort((a, b) => (b?.viewCount || 0) - (a?.viewCount || 0))
  else if (sortBy === 'liked') filteredDiscussions.sort((a, b) => (b?.likeCount || 0) - (a?.likeCount || 0))
  else if (sortBy === 'commented') filteredDiscussions.sort((a, b) => (b?.commentCount || 0) - (a?.commentCount || 0))
  else filteredDiscussions.sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime())

  const pinnedDiscussions = filteredDiscussions.filter((d) => d?.isPinned)
  const unpinnedDiscussions = filteredDiscussions.filter((d) => !d?.isPinned)
  const sortedDiscussions = [...pinnedDiscussions, ...unpinnedDiscussions]

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Discussion Forum</h1>
              <p className="text-muted-foreground mt-1">{loading ? 'Loading...' : `${filteredDiscussions.length} discussions`}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setIsAddPostOpen(true)} className="gap-2" disabled={loading}><Plus className="w-4 h-4" /><span className="hidden sm:inline">New Post</span></Button>
              <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-1">
                <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="gap-2" disabled={loading}><LayoutGrid className="w-4 h-4" /><span className="hidden sm:inline">Grid</span></Button>
                <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="gap-2" disabled={loading}><List className="w-4 h-4" /><span className="hidden sm:inline">List</span></Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <ForumFilters selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} selectedTags={selectedTags} onTagsChange={setSelectedTags} sortBy={sortBy} onSortChange={setSortBy} dateRange={dateRange} onDateRangeChange={setDateRange} stats={stats} />
          </div>
          <div className="lg:col-span-3">
            {loading ? (
              <div className="bg-card border border-border rounded-lg p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground">Loading discussions...</p></div>
            ) : filteredDiscussions.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-12 text-center">
                <p className="text-muted-foreground text-lg">No discussions found. Try adjusting your filters.</p>
                <Button variant="outline" className="mt-4" onClick={() => { setSelectedCategory(null); setSelectedTags([]); setDateRange('all'); setSortBy('newest') }}>Clear all filters</Button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedDiscussions.map((discussion) => discussion?._id && (
                  <DiscussionCard 
                    key={discussion._id} 
                    discussion={discussion} 
                    onImageClick={handleImageClick} 
                    onNavigate={handleNavigateToDiscussion} // ✅ Pass navigation handler
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {sortedDiscussions.map((discussion) => discussion?._id && (
                  <DiscussionListItem 
                    key={discussion._id} 
                    discussion={discussion} 
                    onImageClick={handleImageClick}
                    onNavigate={handleNavigateToDiscussion} // ✅ Pass navigation handler
                  />
                ))}
              </div>
            )}
            {pagination?.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button variant="outline" size="sm" disabled={!pagination.hasPrev || loading} onClick={() => toast.info('Pagination coming soon')}>Previous</Button>
                <span className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.pages}</span>
                <Button variant="outline" size="sm" disabled={!pagination.hasNext || loading} onClick={() => toast.info('Pagination coming soon')}>Next</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl w-full h-full max-h-[90vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 z-50 p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors"><X className="w-6 h-6 text-white" /></button>
            {allImages.length > 1 && <div className="absolute top-4 left-4 bg-black/40 text-white px-3 py-1 rounded-full text-sm font-medium">{imageIndex + 1} / {allImages.length}</div>}
            <img src={getOptimizedImageUrl(selectedImage, 1600, 1200)} alt="Expanded view" className="max-w-full max-h-full object-contain rounded-lg" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/1600x1200?text=Image+unavailable'; e.currentTarget.onerror = null }} />
            {allImages.length > 1 && (<>
              <button onClick={goToPreviousImage} className="absolute left-4 p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors"><ChevronLeft className="w-6 h-6 text-white" /></button>
              <button onClick={goToNextImage} className="absolute right-4 p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors"><ChevronRight className="w-6 h-6 text-white" /></button>
            </>)}
            {allImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 flex-wrap justify-center max-w-lg">
                {allImages.map((img, idx) => (
                  <button key={idx} onClick={() => { setImageIndex(idx); setSelectedImage(img) }} className={`relative w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${imageIndex === idx ? 'border-primary scale-105' : 'border-white/20 hover:border-white/40'}`}>
                    <img src={getOptimizedImageUrl(img, 100, 100)} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/100x100?text=Image+unavailable'; e.currentTarget.onerror = null }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <AddPostModal isOpen={isAddPostOpen} onClose={() => setIsAddPostOpen(false)} onPostCreated={handlePostCreated} categories={CATEGORIES} allTags={ALL_TAGS} />
    </main>
  )
}