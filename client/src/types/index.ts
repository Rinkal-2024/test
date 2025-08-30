export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  ADMIN = 'admin',
  MEMBER = 'member'
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in-progress',
  IN_REVIEW = 'in-review',
  COMPLETED = 'completed'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum ActivityAction {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  STATUS_CHANGED = 'status_changed',
  ASSIGNED = 'assigned',
  UNASSIGNED = 'unassigned'
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  tags: string[];
  assignee?: User;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
  isOverdue?: boolean;
}

export interface ActivityLog {
  _id: string;
  taskId: string;
  userId: string;
  action: ActivityAction;
  changes?: Record<string, any>;
  timestamp: string;
  user?: User;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  stack?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  message: string;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

export interface TaskForm {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  tags: string[];
  assigneeId?: string;
}

export interface UserUpdateForm {
  firstName: string;
  lastName: string;
  email: string;
}

export interface PasswordChangeForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Filter and Query Types
export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assignee?: string[];
  tags?: string[];
  search?: string;
  dueDate?: {
    from?: string;
    to?: string;
  };
  isOverdue?: boolean;
}

export interface UserFilters {
  role?: UserRole[];
  search?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

// Stats Types
export interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  tasksByStatus: Record<TaskStatus, number>;
  tasksByPriority: Record<TaskPriority, number>;
  weeklyTrend: Array<{
    date: string;
    created: number;
    completed: number;
  }>;
}

export interface UserStats {
  totalUsers: number;
  adminUsers: number;
  memberUsers: number;
  activeUsers: number;
  newUsersThisWeek: number;
}

export interface SystemStats {
  databaseStatus: 'healthy' | 'warning' | 'error';
  totalCollections: number;
  recentActivity: ActivityLog[];
  dataHealth: {
    totalTasks: number;
    totalUsers: number;
    totalActivities: number;
  };
}

// Context Types
export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginForm) => Promise<void>;
  register: (userData: RegisterForm) => Promise<void>;
  logout: () => void;
  updateProfile: (userData: UserUpdateForm) => Promise<void>;
  changePassword: (passwords: PasswordChangeForm) => Promise<void>;
}

export interface TaskContextType {
  tasks: Task[];
  selectedTask: Task | null;
  isLoading: boolean;
  filters: TaskFilters;
  pagination: PaginationParams;
  totalPages: number;
  fetchTasks: () => Promise<void>;
  createTask: (task: TaskForm) => Promise<void>;
  updateTask: (id: string, task: Partial<TaskForm>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setSelectedTask: (task: Task | null) => void;
  setFilters: (filters: Partial<TaskFilters>) => void;
  setPagination: (pagination: Partial<PaginationParams>) => void;
  clearFilters: () => void;
}

// UI Component Props
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface NotificationType {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
} 