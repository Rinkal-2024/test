import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { TaskStatus, TaskPriority, UserRole } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (date: string | Date, formatString: string = 'MMM dd, yyyy'): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return isValid(dateObj) ? format(dateObj, formatString) : 'Invalid date';
  } catch {
    return 'Invalid date';
  }
};

export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, 'MMM dd, yyyy HH:mm');
};

export const formatTimeAgo = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return isValid(dateObj) ? formatDistanceToNow(dateObj, { addSuffix: true }) : 'Invalid date';
  } catch {
    return 'Invalid date';
  }
};

export const isOverdue = (dueDate: string): boolean => {
  try {
    const date = parseISO(dueDate);
    return isValid(date) && date < new Date();
  } catch {
    return false;
  }
};

export const getTaskStatusColor = (status: TaskStatus): string => {
  const colors = {
    [TaskStatus.TODO]: 'bg-gray-100 text-gray-800 border-gray-200',
    [TaskStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800 border-blue-200',
    [TaskStatus.IN_REVIEW]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [TaskStatus.COMPLETED]: 'bg-green-100 text-green-800 border-green-200',
  };
  return colors[status] || colors[TaskStatus.TODO];
};

export const getTaskPriorityColor = (priority: TaskPriority): string => {
  const colors = {
    [TaskPriority.LOW]: 'bg-green-100 text-green-800 border-green-200',
    [TaskPriority.MEDIUM]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [TaskPriority.HIGH]: 'bg-orange-100 text-orange-800 border-orange-200',
    [TaskPriority.URGENT]: 'bg-red-100 text-red-800 border-red-200',
  };
  return colors[priority] || colors[TaskPriority.MEDIUM];
};

export const getTaskStatusIcon = (status: TaskStatus): string => {
  const icons = {
    [TaskStatus.TODO]: '📋',
    [TaskStatus.IN_PROGRESS]: '⚡',
    [TaskStatus.IN_REVIEW]: '👀',
    [TaskStatus.COMPLETED]: '✅',
  };
  return icons[status] || '📋';
};

export const getTaskPriorityIcon = (priority: TaskPriority): string => {
  const icons = {
    [TaskPriority.LOW]: '🟢',
    [TaskPriority.MEDIUM]: '🟡',
    [TaskPriority.HIGH]: '🟠',
    [TaskPriority.URGENT]: '🔴',
  };
  return icons[priority] || '🟡';
};

export const getUserRoleColor = (role: UserRole): string => {
  const colors = {
    [UserRole.ADMIN]: 'bg-purple-100 text-purple-800 border-purple-200',
    [UserRole.MEMBER]: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  return colors[role] || colors[UserRole.MEMBER];
};

export const getUserInitials = (firstName: string, lastName: string): string => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

export const getUserFullName = (firstName: string, lastName: string): string => {
  return `${firstName} ${lastName}`;
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const groupBy = <T, K extends keyof any>(
  array: T[],
  getKey: (item: T) => K
): Record<K, T[]> => {
  return array.reduce((grouped, item) => {
    const key = getKey(item);
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
    return grouped;
  }, {} as Record<K, T[]>);
};

export const sortBy = <T>(
  array: T[],
  getKey: (item: T) => any,
  direction: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    const aKey = getKey(a);
    const bKey = getKey(b);
    
    if (aKey < bKey) return direction === 'asc' ? -1 : 1;
    if (aKey > bKey) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

export const truncate = (text: string, length: number = 100): string => {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

export const capitalize = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const storage = {
  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch {
      return defaultValue || null;
    }
  },
  
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  },
  
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
    }
  },
  
  clear: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  },
};

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export const generateId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const hasPermission = (userRole: UserRole, requiredRole: UserRole): boolean => {
  const roleHierarchy = {
    [UserRole.MEMBER]: 0,
    [UserRole.ADMIN]: 1,
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as any).message);
  }
  
  return 'An unexpected error occurred';
}; 