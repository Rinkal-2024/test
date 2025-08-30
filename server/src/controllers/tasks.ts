import { Response } from "express";
import mongoose from "mongoose";
import {
  AuthenticatedRequest,
  AppError,
  ApiResponse,
  PaginatedResponse,
  TaskQuery,
  UserRole,
  ActivityAction,
} from "../types";
import Task from "../models/Task";
import User from "../models/User";
import ActivityLog from "../models/ActivityLog";
import { asyncHandler } from "../utils/asyncHandler";


export const getTasks = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const query: TaskQuery = req.query;

    const {
      search,
      status,
      priority,
      assignee,
      tags,
      dueDateFrom,
      dueDateTo,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const filter: any = {};

    if (req.user.role === UserRole.MEMBER) {
      filter.assignee = req.user._id;
    } else if (assignee) {
      filter.assignee = assignee;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (tags && tags.length > 0) {
      filter.tags = { $in: Array.isArray(tags) ? tags : [tags] };
    }

    if (dueDateFrom || dueDateTo) {
      filter.dueDate = {};
      if (dueDateFrom) filter.dueDate.$gte = new Date(dueDateFrom);
      if (dueDateTo) filter.dueDate.$lte = new Date(dueDateTo);
    }

    const pageNumber = Math.max(1, parseInt(page.toString()));
    const limitNumber = Math.min(100, Math.max(1, parseInt(limit.toString())));
    const skip = (pageNumber - 1) * limitNumber;

    const sort: any = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [tasks, totalTasks] = await Promise.all([
      Task.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNumber)
        .populate("assignee", "firstName lastName email")
        .populate("createdBy", "firstName lastName email"),
      Task.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalTasks / limitNumber);

    const response: PaginatedResponse = {
      success: true,
      message: "Tasks retrieved successfully",
      data: { tasks },
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalItems: totalTasks,
        itemsPerPage: limitNumber,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
      },
    };

    res.status(200).json(response);
  },
);

export const getTaskById = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const { id } = req.params;

    const task = await Task.findById(id)
      .populate("assignee", "firstName lastName email")
      .populate("createdBy", "firstName lastName email");

    if (!task) {
      throw new AppError("Task not found", 404);
    }

    if (
      req.user.role === UserRole.MEMBER &&
      (task.assignee._id || task.assignee).toString() !==
        req.user._id.toString()
    ) {
      throw new AppError(
        "Access denied. You can only view your assigned tasks.",
        403,
      );
    }

    const activityHistory = await ActivityLog.find({ taskId: id })
      .populate("userId", "firstName lastName email")
      .sort({ timestamp: -1 })
      .limit(20);

    const response: ApiResponse = {
      success: true,
      message: "Task retrieved successfully",
      data: {
        task,
        activityHistory,
      },
    };

    res.status(200).json(response);
  },
);

export const createTask = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const { title, description, status, priority, dueDate, tags, assignee } =
      req.body;

    const assigneeUser = await User.findById(assignee);
    if (!assigneeUser) {
      throw new AppError("Assignee not found", 404);
    }

    const task = await Task.create({
      title,
      description,
      status,
      priority,
      dueDate,
      tags,
      assignee,
      createdBy: req.user._id,
    });

    await task.populate("assignee", "firstName lastName email");
    await task.populate("createdBy", "firstName lastName email");

    await ActivityLog.create({
      taskId: task._id,
      userId: req.user._id,
      action: ActivityAction.CREATE,
      changes: { title, assignee: assigneeUser.email },
    });

    const response: ApiResponse = {
      success: true,
      message: "Task created successfully",
      data: { task },
    };

    res.status(201).json(response);
  },
);

export const updateTask = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const { id } = req.params;
    const updates = req.body;

    const task = await Task.findById(id);
    if (!task) {
      throw new AppError("Task not found", 404);
    }

    if (
      req.user.role === UserRole.MEMBER &&
      task.assignee.toString() !== req.user._id.toString()
    ) {
      throw new AppError(
        "Access denied. You can only update your assigned tasks.",
        403,
      );
    }

    const changes: Record<string, any> = {};
    const originalTask = task.toObject();

    if (updates.assignee && updates.assignee !== task.assignee.toString()) {
      const assigneeUser = await User.findById(updates.assignee);
      if (!assigneeUser) {
        throw new AppError("Assignee not found", 404);
      }
      changes.assignee = { from: originalTask.assignee, to: updates.assignee };
    }

    ["title", "description", "status", "priority", "dueDate", "tags"].forEach(
      (field) => {
        const originalValue = (originalTask as any)[field];
        const newValue = (updates as any)[field];

        if (
          newValue !== undefined &&
          JSON.stringify(newValue) !== JSON.stringify(originalValue)
        ) {
          changes[field] = { from: originalValue, to: newValue };
        }
      },
    );

    const updatedTask = await Task.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate("assignee", "firstName lastName email")
      .populate("createdBy", "firstName lastName email");

    if (Object.keys(changes).length > 0) {
      await ActivityLog.create({
        taskId: id,
        userId: req.user._id,
        action: ActivityAction.UPDATE,
        changes,
      });
    }

    const response: ApiResponse = {
      success: true,
      message: "Task updated successfully",
      data: { task: updatedTask },
    };

    res.status(200).json(response);
  },
);


export const deleteTask = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const { id } = req.params;

    const task = await Task.findById(id);
    if (!task) {
      throw new AppError("Task not found", 404);
    }

    if (
      req.user.role === UserRole.MEMBER &&
      task.assignee.toString() !== req.user._id.toString()
    ) {
      throw new AppError(
        "Access denied. You can only delete your assigned tasks.",
        403,
      );
    }

    await Task.findByIdAndDelete(id);

    await ActivityLog.create({
      taskId: id,
      userId: req.user._id,
      action: ActivityAction.DELETE,
      changes: { title: task.title },
    });

    const response: ApiResponse = {
      success: true,
      message: "Task deleted successfully",
    };

    res.status(200).json(response);
  },
);


export const bulkUpdateTasks = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const { taskIds, updates } = req.body;

    const validTaskIds = taskIds.filter((id: string) =>
      mongoose.Types.ObjectId.isValid(id),
    );

    if (validTaskIds.length !== taskIds.length) {
      throw new AppError("One or more task IDs are invalid", 400);
    }

    if (updates.assignee) {
      const assigneeUser = await User.findById(updates.assignee);
      if (!assigneeUser) {
        throw new AppError("Assignee not found", 404);
      }
    }

    const result = await Task.updateMany(
      { _id: { $in: validTaskIds } },
      updates,
      { runValidators: true },
    );

    const activityPromises = validTaskIds.map((taskId: string) =>
      ActivityLog.create({
        taskId,
        userId: req.user!._id,
        action: ActivityAction.UPDATE,
        changes: { bulk: true, updates },
      }),
    );

    await Promise.all(activityPromises);

    const response: ApiResponse = {
      success: true,
      message: `Successfully updated ${result.modifiedCount} task(s)`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
    };

    res.status(200).json(response);
  },
);

export const getOverdueTasks = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const filter: any = {
      dueDate: { $lt: new Date() },
      status: { $ne: "done" },
    };

    if (req.user.role === UserRole.MEMBER) {
      filter.assignee = req.user._id;
    }

    const overdueTasks = await Task.find(filter)
      .sort({ dueDate: 1 })
      .populate("assignee", "firstName lastName email")
      .populate("createdBy", "firstName lastName email");

    const response: ApiResponse = {
      success: true,
      message: "Overdue tasks retrieved successfully",
      data: { tasks: overdueTasks, count: overdueTasks.length },
    };

    res.status(200).json(response);
  },
);

export const getTasksByAssignee = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { assigneeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(assigneeId)) {
      throw new AppError("Invalid assignee ID format", 400);
    }

    const assignee = await User.findById(assigneeId);
    if (!assignee) {
      throw new AppError("Assignee not found", 404);
    }

    const tasks = await Task.find({ assignee: assigneeId })
      .sort({ createdAt: -1 })
      .populate("createdBy", "firstName lastName email");

    const response: ApiResponse = {
      success: true,
      message: "Tasks retrieved successfully",
      data: {
        assignee: {
          _id: assignee._id,
          firstName: assignee.firstName,
          lastName: assignee.lastName,
          email: assignee.email,
        },
        tasks,
        count: tasks.length,
      },
    };

    res.status(200).json(response);
  },
);
