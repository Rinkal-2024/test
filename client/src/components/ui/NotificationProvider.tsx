import React, { createContext, useContext, useState, ReactNode } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { NotificationType } from '../../types'

interface NotificationContextType {
  addNotification: (notification: Omit<NotificationType, 'id'>) => void
  removeNotification: (id: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: ReactNode
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const [notifications, setNotifications] = useState<NotificationType[]>([])

  const addNotification = (notification: Omit<NotificationType, 'id'>) => {
    const id = Math.random().toString(36).substring(2)
    const newNotification: NotificationType = {
      ...notification,
      id,
      duration: notification.duration || 5000
    }

    setNotifications(prev => [...prev, newNotification])

    // Auto remove after duration
    setTimeout(() => {
      removeNotification(id)
    }, newNotification.duration)
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }

  const getIcon = (type: NotificationType['type']) => {
    const icons = {
      success: CheckCircle,
      error: XCircle,
      warning: AlertTriangle,
      info: Info
    }
    return icons[type]
  }

  const getColors = (type: NotificationType['type']) => {
    const colors = {
      success: 'bg-green-50 border-green-200 text-green-800',
      error: 'bg-red-50 border-red-200 text-red-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800'
    }
    return colors[type]
  }

  const getIconColors = (type: NotificationType['type']) => {
    const colors = {
      success: 'text-green-400',
      error: 'text-red-400',
      warning: 'text-yellow-400',
      info: 'text-blue-400'
    }
    return colors[type]
  }

  return (
    <NotificationContext.Provider value={{ addNotification, removeNotification }}>
      {children}
      
      {/* Notification Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {notifications.map((notification) => {
          const Icon = getIcon(notification.type)
          return (
            <div
              key={notification.id}
              className={`
                rounded-lg border p-4 shadow-lg animate-in slide-in-from-right duration-300
                ${getColors(notification.type)}
              `}
            >
              <div className="flex items-start">
                <Icon className={`w-5 h-5 mt-0.5 mr-3 flex-shrink-0 ${getIconColors(notification.type)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{notification.title}</p>
                  {notification.message && (
                    <p className="text-sm opacity-90 mt-1">{notification.message}</p>
                  )}
                </div>
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="ml-3 flex-shrink-0 rounded-full p-1 hover:bg-black/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </NotificationContext.Provider>
  )
} 