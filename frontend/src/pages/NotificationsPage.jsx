import { useState, useEffect, useCallback } from 'react'
import { 
  Bell, CheckCircle, AlertCircle, Info, XCircle, Trash2, Check, 
  Loader2, RefreshCw, Server 
} from 'lucide-react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import api from '../api/api'
import { useAuth } from "@/context/AuthContext"

function getNotificationIcon(type) {
  switch (type) {
    case 'success': return <CheckCircle className="w-5 h-5 text-emerald-600" />
    case 'error': return <XCircle className="w-5 h-5 text-red-600" />
    case 'warning': return <AlertCircle className="w-5 h-5 text-amber-600" />
    case 'info': return <Info className="w-5 h-5 text-blue-600" />
    default: return <Bell className="w-5 h-5 text-gray-500" />
  }
}

function formatTimestamp(date) {
  const parsedDate = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - parsedDate.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return parsedDate.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
    year: parsedDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

export default function NotificationsPage() {
  const { token, loading: authLoading, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)

  // GET /notifications
  const fetchNotifications = useCallback(async () => {
    if (!token) return

    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/notifications')
      const data = response.data
      setNotifications(Array.isArray(data) ? data : data.notifications || [])
    } catch (err) {
      if (err.response?.status === 401) {
        logout()
        navigate('/login', { 
          state: { from: '/notifications', message: 'Session expired. Please log in again.' } 
        })
        return
      }
      if (!err.isAuthError) {
        console.error('Error fetching notifications:', err)
        setError(err.userMessage || err.message || 'Failed to load notifications')
        setNotifications([])
      }
    } finally {
      setLoading(false)
    }
  }, [token, logout, navigate])

  // GET /notifications/unread-count
  const fetchUnreadCount = useCallback(async () => {
    if (!token) return

    try {
      const response = await api.get('/notifications/unread-count')
      const data = response.data
      setUnreadCount(data.count ?? data.unreadCount ?? 0)
    } catch (err) {
      if (err.response?.status === 401) {
        logout()
        return
      }
      if (!err.isAuthError) {
        console.debug('Could not fetch unread count:', err.message)
      }
    }
  }, [token, logout])

  // 🔐 Auth guard + fetch logic
  useEffect(() => {
    // Wait for auth context to initialize
    if (authLoading) return
    
    // If not authenticated, redirect to login WITH return path
    if (!token) {
      navigate('/login', { 
        state: { 
          from: location.pathname, // Save current path for redirect after login
          message: 'Please log in to view notifications' 
        } 
      })
      return
    }
    
    // Authenticated: fetch data
    fetchNotifications()
  }, [token, authLoading, location.pathname, fetchNotifications, navigate])

  // Fetch unread count after notifications load
  useEffect(() => { 
    if (!loading && token) fetchUnreadCount() 
  }, [loading, token, fetchUnreadCount])

  // PATCH /notifications/:id/read
  const handleMarkAsRead = async (id) => {
    if (!token) {
      navigate('/login', { state: { from: location.pathname } })
      return
    }

    setActionLoading(`read-${id}`)
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      ))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      if (err.response?.status === 401) {
        logout()
        navigate('/login', { state: { from: location.pathname } })
        return
      }
      if (!err.isAuthError) {
        setError(err.userMessage || err.message)
        fetchNotifications()
      }
    } finally {
      setActionLoading(null)
    }
  }

  // DELETE /notifications/:id
  const handleDelete = async (id) => {
    if (!token) {
      navigate('/login', { state: { from: location.pathname } })
      return
    }

    setActionLoading(`delete-${id}`)
    try {
      await api.delete(`/notifications/${id}`)
      setNotifications(prev => prev.filter(n => n.id !== id))
      fetchUnreadCount()
    } catch (err) {
      if (err.response?.status === 401) {
        logout()
        navigate('/login', { state: { from: location.pathname } })
        return
      }
      if (!err.isAuthError) {
        setError(err.userMessage || err.message)
        fetchNotifications()
      }
    } finally {
      setActionLoading(null)
    }
  }

  // PATCH /notifications/read-all
  const handleMarkAllRead = async () => {
    if (!token) {
      navigate('/login', { state: { from: location.pathname } })
      return
    }

    setActionLoading('markAll')
    try {
      await api.patch('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (err) {
      if (err.response?.status === 401) {
        logout()
        navigate('/login', { state: { from: location.pathname } })
        return
      }
      if (!err.isAuthError) {
        setError(err.userMessage || err.message)
        fetchNotifications()
        fetchUnreadCount()
      }
    } finally {
      setActionLoading(null)
    }
  }

  // DELETE /notifications?read=true
  const handleClearRead = async () => {
    if (!token) {
      navigate('/login', { state: { from: location.pathname } })
      return
    }

    setActionLoading('clearRead')
    try {
      await api.delete('/notifications', { params: { read: true } })
      setNotifications(prev => prev.filter(n => !n.isRead))
      fetchUnreadCount()
    } catch (err) {
      if (err.response?.status === 401) {
        logout()
        navigate('/login', { state: { from: location.pathname } })
        return
      }
      if (!err.isAuthError) {
        setError(err.userMessage || err.message)
        fetchNotifications()
      }
    } finally {
      setActionLoading(null)
    }
  }

  const hasNotifications = notifications.length > 0

  // Show loading while auth OR data is loading
  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">
            {authLoading ? 'Verifying session...' : 'Loading notifications...'}
          </p>
        </div>
      </main>
    )
  }

  // If not authenticated after loading, redirect is handled by useEffect
  // This return prevents flash of content
  if (!token) {
    return null
  }

  // Error state
  if (error && notifications.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          <Server className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          
          <div className="bg-gray-100 rounded-lg p-4 text-left text-sm text-gray-700 mb-6">
            <p className="font-medium mb-2">Troubleshooting:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Backend running at <code className="bg-gray-200 px-1 rounded">http://localhost:5000</code></li>
              <li>Valid JWT token in localStorage</li>
              <li>CORS enabled for your frontend origin</li>
            </ul>
          </div>
          
          <button
            onClick={() => {
              setError(null)
              fetchNotifications()
              fetchUnreadCount()
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Bell className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={actionLoading === 'markAll'}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50"
              >
                {actionLoading === 'markAll' ? (
                  <Loader2 className="w-4 h-4 animate-spin inline" />
                ) : 'Mark all as read'}
              </button>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            {unreadCount > 0 ? (
              <p className="text-sm text-gray-600">
                You have <span className="text-blue-600 font-semibold">{unreadCount}</span> unread notification{unreadCount === 1 ? '' : 's'}
              </p>
            ) : (
              <p className="text-sm text-gray-500">All caught up!</p>
            )}
            {hasNotifications && unreadCount < notifications.length && (
              <button
                onClick={handleClearRead}
                disabled={actionLoading === 'clearRead'}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'clearRead' ? (
                  <Loader2 className="w-4 h-4 animate-spin inline" />
                ) : 'Clear read'}
              </button>
            )}
          </div>
          
          {error && notifications.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Notifications List */}
        {hasNotifications ? (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-lg border transition-all ${
                  notification.isRead
                    ? 'bg-white border-gray-200'
                    : 'bg-blue-50 border-blue-200 ring-1 ring-blue-100'
                }`}
              >
                <div className="p-4 flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <h3 className={`text-sm font-semibold ${notification.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                        {notification.title}
                      </h3>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {formatTimestamp(notification.timestamp)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">{notification.message}</p>

                    <div className="flex items-center justify-between">
                      {notification.context && (
                        <span className="inline-block px-2 py-1 bg-gray-100 rounded text-xs text-gray-700 font-medium">
                          {notification.context}
                        </span>
                      )}
                      {notification.actionLink && (
                        <Link to={notification.actionLink} className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
                          {notification.actionLabel}
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex gap-2">
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        disabled={actionLoading === `read-${notification.id}`}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                        title="Mark as read"
                      >
                        {actionLoading === `read-${notification.id}` ? (
                          <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id)}
                      disabled={actionLoading === `delete-${notification.id}`}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete notification"
                    >
                      {actionLoading === `delete-${notification.id}` ? (
                        <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-600" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No notifications</h2>
            <p className="text-sm text-gray-500">You are all caught up! Check back later for updates.</p>
          </div>
        )}
      </div>
    </main>
  )
}