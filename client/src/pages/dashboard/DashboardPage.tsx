import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import apiService from '../../services/api'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { CheckSquare, Clock, AlertCircle, TrendingUp } from 'lucide-react'
import { cn, formatDate } from '../../utils'

export const DashboardPage = () => {
  const { user } = useAuth()
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats', 'overview'],
    queryFn: () => apiService.getOverviewStats(),
  })

  const { data: recentTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', 'recent'],
    queryFn: () => apiService.getTasks(undefined, { page: 1, limit: 5 }),
  })

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const taskStats = stats?.data || {
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0
  }

  const statCards = [
    {
      title: 'Total Tasks',
      value: taskStats.totalTasks,
      icon: CheckSquare,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      title: 'Completed',
      value: taskStats.completedTasks,
      icon: TrendingUp,
      color: 'text-green-600 bg-green-100',
    },
    {
      title: 'Pending',
      value: taskStats.pendingTasks,
      icon: Clock,
      color: 'text-yellow-600 bg-yellow-100',
    },
    {
      title: 'Overdue',
      value: taskStats.overdueTasks,
      icon: AlertCircle,
      color: 'text-red-600 bg-red-100',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your tasks today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className="bg-white rounded-lg shadow p-6 border border-gray-200"
          >
            <div className="flex items-center">
              <div className={cn('p-3 rounded-lg', stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Tasks */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Tasks</h2>
        </div>
        <div className="p-6">
          {tasksLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : recentTasks?.data?.items?.length ? (
            <div className="space-y-4">
              {recentTasks.data.items.map((task) => (
                <div
                  key={task._id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {task.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Created {formatDate(task.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        task.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : task.status === 'in-progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      )}
                    >
                      {task.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first task.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 