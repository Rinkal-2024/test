import { Request } from "express";
import { Document } from "mongoose";

export enum UserRole {
  ADMIN = "admin",
  MEMBER = "member",
}

export interface IUser extends Document {
  _id: string;
  email: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export enum TaskStatus {
  TODO = "todo",
  IN_PROGRESS = "in-progress",
  DONE = "done",
}

export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export interface ITask extends Document {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  tags: string[];
  assignee: any;
  createdBy: any;
  createdAt: Date;
  updatedAt: Date;
}

export enum ActivityAction {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
}

export interface IActivityLog extends Document {
  _id: string;
  taskId: any;
  userId: any;
  action: ActivityAction;
  changes?: Record<string, any>;
  timestamp: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface TaskQuery {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string;
  tags?: string[];
  dueDateFrom?: Date;
  dueDateTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface UserQuery {
  search?: string;
  role?: UserRole;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface TaskStats {
  totalTasks: number;
  tasksByStatus: Record<TaskStatus, number>;
  tasksByPriority: Record<TaskPriority, number>;
  overdueTasks: number;
  tasksCompletedThisWeek: number;
  tasksCreatedThisWeek: number;
  userTaskCounts: Array<{
    userId: string;
    firstName: string;
    lastName: string;
    taskCount: number;
  }>;
}

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}
