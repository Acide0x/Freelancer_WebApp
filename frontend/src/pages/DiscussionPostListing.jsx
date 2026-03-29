// DiscussionForum.jsx
import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { 
  Heart, 
  MessageCircle, 
  Eye, 
  Pin, 
  List, 
  LayoutGrid, 
  X, 
  ChevronRight, 
  ZoomIn, 
  ChevronLeft, 
  ChevronRight as ChevronRightIcon 
} from 'lucide-react'

// Mock data based on schema
const mockDiscussions = [
  {
    id: '1',
    title: 'Best practices for React hooks in production',
    content: 'I am looking for best practices when using React hooks in production environments. What are your recommendations?',
    author: {
      id: 'user1',
      fullName: 'Sarah Chen',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    },
    category: 'Technical',
    tags: ['react', 'hooks', 'best-practices'],
    likeCount: 24,
    viewCount: 342,
    commentCount: 8,
    isClosed: false,
    isPinned: true,
    createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
    isLiked: false,
    images: [
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1633356122544-f134324ef6db?w=500&h=400&fit=crop',
    ],
  },
  {
    id: '2',
    title: 'Showcase: Built a real-time collaboration tool',
    content: 'Excited to share my new project - a real-time collaboration tool built with WebSockets. Check it out and let me know what you think!',
    author: {
      id: 'user2',
      fullName: 'Alex Rodriguez',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    },
    category: 'Showcase',
    tags: ['websockets', 'collaboration', 'project'],
    likeCount: 156,
    viewCount: 1203,
    commentCount: 34,
    isClosed: false,
    isPinned: false,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    isLiked: false,
    images: [
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=400&fit=crop',
    ],
  },
  {
    id: '3',
    title: 'Looking for feedback on my design system',
    content: 'I have created a design system with 100+ components. Would love to get some constructive feedback from the community.',
    author: {
      id: 'user3',
      fullName: 'Jordan Lee',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan',
    },
    category: 'Feedback',
    tags: ['design-system', 'ui', 'feedback'],
    likeCount: 89,
    viewCount: 567,
    commentCount: 21,
    isClosed: false,
    isPinned: false,
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    isLiked: false,
    images: [
      'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=500&h=400&fit=crop',
    ],
  },
  {
    id: '4',
    title: 'Job opportunities in tech - March 2024',
    content: 'Sharing job opportunities I have found this month. Companies are actively hiring. Share your openings too!',
    author: {
      id: 'user4',
      fullName: 'Morgan Smith',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Morgan',
    },
    category: 'Hiring',
    tags: ['jobs', 'hiring', 'opportunities'],
    likeCount: 45,
    viewCount: 892,
    commentCount: 56,
    isClosed: false,
    isPinned: false,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    isLiked: false,
  },
  {
    id: '5',
    title: 'Collaboration: Looking for frontend developers',
    content: 'Building a startup and looking for talented frontend developers to join our mission. We are using React and TypeScript.',
    author: {
      id: 'user5',
      fullName: 'Casey Johnson',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Casey',
    },
    category: 'Collaboration',
    tags: ['startup', 'frontend', 'hiring'],
    likeCount: 78,
    viewCount: 445,
    commentCount: 12,
    isClosed: false,
    isPinned: false,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    isLiked: false,
    images: [
      'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=400&fit=crop',
    ],
  },
  {
    id: '6',
    title: 'Career advice: transitioning to tech',
    content: 'I am planning to transition from a different field to tech. Any advice on how to get started? What should I focus on?',
    author: {
      id: 'user6',
      fullName: 'Taylor Brown',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Taylor',
    },
    category: 'Job Advice',
    tags: ['career', 'transition', 'advice'],
    likeCount: 234,
    viewCount: 1856,
    commentCount: 78,
    isClosed: false,
    isPinned: false,
    createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
    isLiked: false,
  },
]

const CATEGORIES = [
  'General',
  'Job Advice',
  'Technical',
  'Showcase',
  'Feedback',
  'Collaboration',
  'Hiring',
]

const ALL_TAGS = [
  'react',
  'hooks',
  'best-practices',
  'websockets',
  'collaboration',
  'project',
  'design-system',
  'ui',
  'feedback',
  'jobs',
  'hiring',
  'opportunities',
  'startup',
  'frontend',
  'career',
  'transition',
  'advice',
]

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

const getInitials = (name) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

const formatDate = (date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (days > 7) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  if (days > 0) {
    return `${days}d ago`
  }
  if (hours > 0) {
    return `${hours}h ago`
  }
  return 'now'
}

// Grid Card Component
function DiscussionCard({ discussion, onImageClick }) {
  const [isLiked, setIsLiked] = useState(discussion.isLiked)
  const [likeCount, setLikeCount] = useState(discussion.likeCount)

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1)
  }

  return (
    <article className="group bg-card border border-border hover:border-primary/50 rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md flex flex-col h-full">
      <div className="p-4 border-b border-border/50 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={discussion.author.avatar} />
            <AvatarFallback>{getInitials(discussion.author.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-foreground">
              {discussion.author.fullName}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(discussion.createdAt)}
            </p>
          </div>
        </div>
        {discussion.isPinned && (
          <Pin className="w-4 h-4 text-amber-500 flex-shrink-0" fill="currentColor" />
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-base font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {discussion.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-3 flex-1 mb-3">
          {discussion.content}
        </p>

        {discussion.images && discussion.images.length > 0 && (
          <div className="mb-3 grid gap-2">
            {discussion.images.length === 1 ? (
              <button
                onClick={() => onImageClick(discussion.images, 0)}
                className="relative group/img overflow-hidden rounded-md h-48 bg-muted hover:opacity-90 transition-opacity"
              >
                <img
                  src={discussion.images[0]}
                  alt="Post content"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
                </div>
              </button>
            ) : discussion.images.length === 2 ? (
              <div className="grid grid-cols-2 gap-2">
                {discussion.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => onImageClick(discussion.images, idx)}
                    className="relative group/img overflow-hidden rounded-md h-24 bg-muted hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={img}
                      alt={`Post content ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
                      <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {discussion.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => onImageClick(discussion.images, idx)}
                    className="relative group/img overflow-hidden rounded-md h-20 bg-muted hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={img}
                      alt={`Post content ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {idx === 2 && discussion.images.length > 3 && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">+{discussion.images.length - 3}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
                      <ZoomIn className="w-3 h-3 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          <Badge
            variant="outline"
            className={`text-xs border ${getCategoryColor(discussion.category)}`}
          >
            {discussion.category}
          </Badge>
          {discussion.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {discussion.tags.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{discussion.tags.length - 2}
            </Badge>
          )}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-border/50 bg-muted/30 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Heart
              className="w-4 h-4"
              fill={isLiked ? 'currentColor' : 'none'}
              color={isLiked ? '#ef4444' : 'currentColor'}
            />
            <span>{likeCount}</span>
          </button>
          <div className="flex items-center gap-1.5 hover:text-foreground transition-colors">
            <MessageCircle className="w-4 h-4" />
            <span>{discussion.commentCount}</span>
          </div>
          <div className="flex items-center gap-1.5 hover:text-foreground transition-colors">
            <Eye className="w-4 h-4" />
            <span>{discussion.viewCount}</span>
          </div>
        </div>
        {discussion.isClosed && (
          <span className="text-xs px-2 py-1 bg-muted border border-border rounded text-destructive font-medium">
            Closed
          </span>
        )}
      </div>
    </article>
  )
}

// List Item Component
function DiscussionListItem({ discussion, onImageClick }) {
  const [isLiked, setIsLiked] = useState(discussion.isLiked)
  const [likeCount, setLikeCount] = useState(discussion.likeCount)

  const handleLike = (e) => {
    e.preventDefault()
    setIsLiked(!isLiked)
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1)
  }

  return (
    <article className="group bg-card border border-border hover:border-primary/50 rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md p-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={discussion.author.avatar} />
            <AvatarFallback>{getInitials(discussion.author.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {discussion.isPinned && (
                <Pin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="currentColor" />
              )}
              <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {discussion.title}
              </h3>
              {discussion.isClosed && (
                <span className="text-xs px-2 py-0.5 bg-destructive/10 text-destructive rounded font-medium flex-shrink-0">
                  Closed
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
              {discussion.content}
            </p>
            <div className="flex items-center flex-wrap gap-2">
              <Badge
                variant="outline"
                className={`text-xs border ${getCategoryColor(discussion.category)}`}
              >
                {discussion.category}
              </Badge>
              {discussion.tags.slice(0, 1).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {discussion.tags.length > 1 && (
                <span className="text-xs text-muted-foreground">
                  +{discussion.tags.length - 1} more
                </span>
              )}
              <span className="text-xs text-muted-foreground ml-auto sm:ml-0">
                {discussion.author.fullName} • {formatDate(discussion.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {discussion.images && discussion.images.length > 0 && (
          <div className="flex gap-2 ml-13">
            {discussion.images.slice(0, 3).map((img, idx) => (
              <button
                key={idx}
                onClick={() => onImageClick(discussion.images, idx)}
                className="relative group/img overflow-hidden rounded-md w-20 h-20 bg-muted hover:opacity-90 transition-opacity flex-shrink-0"
              >
                <img
                  src={img}
                  alt={`Post content ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                {idx === 2 && discussion.images.length > 3 && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white font-semibold text-xs">+{discussion.images.length - 3}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-3 h-3 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between sm:justify-end gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-4 order-2 sm:order-none">
            <button
              onClick={handleLike}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <Heart
                className="w-4 h-4"
                fill={isLiked ? 'currentColor' : 'none'}
                color={isLiked ? '#ef4444' : 'currentColor'}
              />
              <span className="hidden sm:inline">{likeCount}</span>
            </button>
            <div className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">{discussion.commentCount}</span>
            </div>
            <div className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">{discussion.viewCount}</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors order-1 sm:order-none flex-shrink-0" />
        </div>
      </div>
    </article>
  )
}

// Filters Sidebar Component
function ForumFilters({
  selectedCategory,
  onCategoryChange,
  selectedTags,
  onTagsChange,
  sortBy,
  onSortChange,
  dateRange,
  onDateRangeChange,
}) {
  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag))
    } else {
      onTagsChange([...selectedTags, tag])
    }
  }

  const clearFilters = () => {
    onCategoryChange(null)
    onTagsChange([])
    onSortChange('newest')
    onDateRangeChange('all')
  }

  const hasActiveFilters =
    selectedCategory !== null || selectedTags.length > 0 || sortBy !== 'newest' || dateRange !== 'all'

  return (
    <div className="space-y-4 sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto">
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={clearFilters}
          className="w-full text-xs"
        >
          Clear Filters
        </Button>
      )}

      <Card className="p-4 border-border">
        <h3 className="font-semibold text-sm mb-3 text-foreground">Sort By</h3>
        <div className="space-y-2">
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-full text-sm h-9">
              <SelectValue />
            </SelectTrigger>
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
          {[
            { value: 'all', label: 'Any Time' },
            { value: 'day', label: 'This Day' },
            { value: 'week', label: 'This Week' },
            { value: 'month', label: 'This Month' },
            { value: 'year', label: 'This Year' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => onDateRangeChange(option.value)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                dateRange === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-4 border-border">
        <h3 className="font-semibold text-sm mb-3 text-foreground">Categories</h3>
        <div className="space-y-2">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() =>
                onCategoryChange(selectedCategory === category ? null : category)
              }
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? `${getCategoryColor(category)} border`
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-4 border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-foreground">Tags</h3>
          {selectedTags.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {selectedTags.length} selected
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`relative px-2 py-1 text-xs rounded-md font-medium transition-all ${
                selectedTags.includes(tag)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-muted'
              }`}
            >
              {tag}
              {selectedTags.includes(tag) && (
                <X className="w-3 h-3 ml-1 inline-block" />
              )}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-4 border-border bg-muted/30">
        <h3 className="font-semibold text-sm mb-3 text-foreground">Stats</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total Discussions</span>
            <span className="font-semibold text-foreground">42</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Active Users</span>
            <span className="font-semibold text-foreground">156</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total Comments</span>
            <span className="font-semibold text-foreground">1,247</span>
          </div>
        </div>
      </Card>
    </div>
  )
}

// Main Page Component
export default function DiscussionForum() {
  const [viewMode, setViewMode] = useState('grid')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedTags, setSelectedTags] = useState([])
  const [sortBy, setSortBy] = useState('newest')
  const [dateRange, setDateRange] = useState('all')
  const [selectedImage, setSelectedImage] = useState(null)
  const [imageIndex, setImageIndex] = useState(0)
  const [allImages, setAllImages] = useState([])

  const handleImageClick = (images, index) => {
    setAllImages(images)
    setImageIndex(index)
    setSelectedImage(images[index])
  }

  const goToPreviousImage = () => {
    const newIndex = imageIndex === 0 ? allImages.length - 1 : imageIndex - 1
    setImageIndex(newIndex)
    setSelectedImage(allImages[newIndex])
  }

  const goToNextImage = () => {
    const newIndex = imageIndex === allImages.length - 1 ? 0 : imageIndex + 1
    setImageIndex(newIndex)
    setSelectedImage(allImages[newIndex])
  }

  // Date range filter
  const getDateRangeStart = () => {
    const now = new Date()
    switch (dateRange) {
      case 'day':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate())
      case 'week':
        const weekAgo = new Date(now)
        weekAgo.setDate(now.getDate() - 7)
        return weekAgo
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1)
      case 'year':
        return new Date(now.getFullYear(), 0, 1)
      default:
        return new Date(0)
    }
  }

  // Filter discussions
  let filteredDiscussions = mockDiscussions
  if (selectedCategory) {
    filteredDiscussions = filteredDiscussions.filter(
      (d) => d.category === selectedCategory
    )
  }
  if (selectedTags.length > 0) {
    filteredDiscussions = filteredDiscussions.filter((d) =>
      selectedTags.some((tag) => d.tags.includes(tag))
    )
  }
  if (dateRange !== 'all') {
    const startDate = getDateRangeStart()
    filteredDiscussions = filteredDiscussions.filter(
      (d) => d.createdAt.getTime() >= startDate.getTime()
    )
  }

  // Sort discussions
  if (sortBy === 'popular') {
    filteredDiscussions.sort((a, b) => b.viewCount - a.viewCount)
  } else if (sortBy === 'liked') {
    filteredDiscussions.sort((a, b) => b.likeCount - a.likeCount)
  } else if (sortBy === 'commented') {
    filteredDiscussions.sort((a, b) => b.commentCount - a.commentCount)
  } else {
    filteredDiscussions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  // Pinned discussions first
  const pinnedDiscussions = filteredDiscussions.filter((d) => d.isPinned)
  const unpinnedDiscussions = filteredDiscussions.filter((d) => !d.isPinned)
  const sortedDiscussions = [...pinnedDiscussions, ...unpinnedDiscussions]

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
                Discussion Forum
              </h1>
              <p className="text-muted-foreground mt-1">
                {filteredDiscussions.length} discussions
              </p>
            </div>
            <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="gap-2"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Grid</span>
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="gap-2"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">List</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Filters */}
          <div className="lg:col-span-1">
            <ForumFilters
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              sortBy={sortBy}
              onSortChange={setSortBy}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {filteredDiscussions.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-12 text-center">
                <p className="text-muted-foreground text-lg">
                  No discussions found. Try adjusting your filters.
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedDiscussions.map((discussion) => (
                  <DiscussionCard
                    key={discussion.id}
                    discussion={discussion}
                    onImageClick={handleImageClick}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {sortedDiscussions.map((discussion) => (
                  <DiscussionListItem
                    key={discussion.id}
                    discussion={discussion}
                    onImageClick={handleImageClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-4xl w-full h-full max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-50 p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {/* Image counter */}
            {allImages.length > 1 && (
              <div className="absolute top-4 left-4 bg-black/40 text-white px-3 py-1 rounded-full text-sm font-medium">
                {imageIndex + 1} / {allImages.length}
              </div>
            )}

            {/* Main image */}
            <img
              src={selectedImage}
              alt="Expanded view"
              className="max-w-full max-h-full object-contain rounded-lg"
            />

            {/* Navigation buttons */}
            {allImages.length > 1 && (
              <>
                <button
                  onClick={goToPreviousImage}
                  className="absolute left-4 p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={goToNextImage}
                  className="absolute right-4 p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors"
                >
                  <ChevronRightIcon className="w-6 h-6 text-white" />
                </button>
              </>
            )}

            {/* Thumbnail strip */}
            {allImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 flex-wrap justify-center max-w-lg">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setImageIndex(idx)
                      setSelectedImage(img)
                    }}
                    className={`relative w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${
                      imageIndex === idx
                        ? 'border-primary scale-105'
                        : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}