import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  ApiResponse,
  PaginatedResponse,
  User,
  Task,
  LoginForm,
  RegisterForm,
  TaskForm,
  UserUpdateForm,
  PasswordChangeForm,
  TaskFilters,
  UserFilters,
  PaginationParams,
  TaskStats,
  UserStats,
  SystemStats,
  ActivityLog
} from '../types';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      withCredentials: true, // For cookie-based auth
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          // Clear token and redirect to login
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.api.request<T>(config);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (error.response?.data?.message) {
      return new Error(error.response.data.message);
    }
    if (error.message) {
      return new Error(error.message);
    }
    return new Error('An unexpected error occurred');
  }

  // Authentication
  async login(credentials: LoginForm): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.request<ApiResponse<{ user: User; token: string }>>({
      method: 'POST',
      url: '/auth/login',
      data: credentials,
    });

    // Store token
    if (response.data?.token) {
      localStorage.setItem('token', response.data.token);
    }

    return response;
  }

  async register(userData: RegisterForm): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.request<ApiResponse<{ user: User; token: string }>>({
      method: 'POST',
      url: '/auth/register',
      data: userData,
    });

    // Store token
    if (response.data?.token) {
      localStorage.setItem('token', response.data.token);
    }

    return response;
  }

  async logout(): Promise<ApiResponse> {
    try {
      const response = await this.request<ApiResponse>({
        method: 'POST',
        url: '/auth/logout',
      });
      localStorage.removeItem('token');
      return response;
    } catch (error) {
      // Even if the API call fails, remove the token
      localStorage.removeItem('token');
      throw error;
    }
  }

  async getProfile(): Promise<ApiResponse<User>> {
    return this.request<ApiResponse<User>>({
      method: 'GET',
      url: '/auth/profile',
    });
  }

  async updateProfile(userData: UserUpdateForm): Promise<ApiResponse<User>> {
    return this.request<ApiResponse<User>>({
      method: 'PATCH',
      url: '/auth/profile',
      data: userData,
    });
  }

  async changePassword(passwords: PasswordChangeForm): Promise<ApiResponse> {
    return this.request<ApiResponse>({
      method: 'POST',
      url: '/auth/change-password',
      data: passwords,
    });
  }

  async verifyToken(): Promise<ApiResponse<User>> {
    return this.request<ApiResponse<User>>({
      method: 'GET',
      url: '/auth/verify',
    });
  }

  // Tasks
  async getTasks(
    filters?: TaskFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Task>> {
    const params = new URLSearchParams();
    
    if (pagination) {
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
    }

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else if (typeof value === 'object') {
            // Handle nested objects like dueDate
            Object.entries(value).forEach(([nestedKey, nestedValue]) => {
              if (nestedValue) {
                params.append(`${key}.${nestedKey}`, nestedValue.toString());
              }
            });
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    return this.request<PaginatedResponse<Task>>({
      method: 'GET',
      url: `/tasks?${params.toString()}`,
    });
  }

  async getTask(id: string): Promise<ApiResponse<Task & { activityHistory: ActivityLog[] }>> {
    return this.request<ApiResponse<Task & { activityHistory: ActivityLog[] }>>({
      method: 'GET',
      url: `/tasks/${id}`,
    });
  }

  async createTask(taskData: TaskForm): Promise<ApiResponse<Task>> {
    return this.request<ApiResponse<Task>>({
      method: 'POST',
      url: '/tasks',
      data: taskData,
    });
  }

  async updateTask(id: string, taskData: Partial<TaskForm>): Promise<ApiResponse<Task>> {
    return this.request<ApiResponse<Task>>({
      method: 'PATCH',
      url: `/tasks/${id}`,
      data: taskData,
    });
  }

  async deleteTask(id: string): Promise<ApiResponse> {
    return this.request<ApiResponse>({
      method: 'DELETE',
      url: `/tasks/${id}`,
    });
  }

  async getOverdueTasks(): Promise<ApiResponse<Task[]>> {
    return this.request<ApiResponse<Task[]>>({
      method: 'GET',
      url: '/tasks/overdue',
    });
  }

  async getTasksByAssignee(assigneeId: string): Promise<ApiResponse<Task[]>> {
    return this.request<ApiResponse<Task[]>>({
      method: 'GET',
      url: `/tasks/assignee/${assigneeId}`,
    });
  }

  async bulkUpdateTasks(
    taskIds: string[],
    updates: Partial<TaskForm>
  ): Promise<ApiResponse<{ updated: number }>> {
    return this.request<ApiResponse<{ updated: number }>>({
      method: 'PATCH',
      url: '/tasks/bulk',
      data: { taskIds, updates },
    });
  }

  // Users
  async getUsers(
    filters?: UserFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<User>> {
    const params = new URLSearchParams();
    
    if (pagination) {
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
    }

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    return this.request<PaginatedResponse<User>>({
      method: 'GET',
      url: `/users?${params.toString()}`,
    });
  }

  async getUser(id: string): Promise<ApiResponse<User & { taskStats: any }>> {
    return this.request<ApiResponse<User & { taskStats: any }>>({
      method: 'GET',
      url: `/users/${id}`,
    });
  }

  async updateUserRole(id: string, role: string): Promise<ApiResponse<User>> {
    return this.request<ApiResponse<User>>({
      method: 'PATCH',
      url: `/users/${id}/role`,
      data: { role },
    });
  }

  async deleteUser(id: string): Promise<ApiResponse> {
    return this.request<ApiResponse>({
      method: 'DELETE',
      url: `/users/${id}`,
    });
  }

  async getUserDashboard(id?: string): Promise<ApiResponse<any>> {
    const url = id ? `/users/dashboard/${id}` : '/users/dashboard';
    return this.request<ApiResponse<any>>({
      method: 'GET',
      url,
    });
  }

  // Statistics
  async getOverviewStats(): Promise<ApiResponse<TaskStats>> {
    return this.request<ApiResponse<TaskStats>>({
      method: 'GET',
      url: '/stats/overview',
    });
  }

  async getAnalytics(): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>({
      method: 'GET',
      url: '/stats/analytics',
    });
  }

  async getTeamStats(): Promise<ApiResponse<UserStats>> {
    return this.request<ApiResponse<UserStats>>({
      method: 'GET',
      url: '/stats/team',
    });
  }

  async getSystemStats(): Promise<ApiResponse<SystemStats>> {
    return this.request<ApiResponse<SystemStats>>({
      method: 'GET',
      url: '/stats/system',
    });
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    return this.request<ApiResponse>({
      method: 'GET',
      url: '/health',
    });
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService; 