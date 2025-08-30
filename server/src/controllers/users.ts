import { Response } from "express";
import mongoose from "mongoose";
import {
  AuthenticatedRequest,
  AppError,
  ApiResponse,
  PaginatedResponse,
  UserQuery,
  UserRole,
} from "../types";
import User from "../models/User";
import Task from "../models/Task";
import { asyncHandler } from "../utils/asyncHandler";

export const getUsers = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const query: UserQuery = req.query;

    const {
      search,
      role,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const filter: any = {};

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (role) {
      filter.role = role;
    }

    const pageNumber = Math.max(1, parseInt(page.toString()));
    const limitNumber = Math.min(100, Math.max(1, parseInt(limit.toString())));
    const skip = (pageNumber - 1) * limitNumber;

    const sort: any = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNumber)
        .select("-password"),
      User.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalUsers / limitNumber);

    const response: PaginatedResponse = {
      success: true,
      message: "Users retrieved successfully",
      data: { users },
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalItems: totalUsers,
        itemsPerPage: limitNumber,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
      },
    };

    res.status(200).json(response);
  },
);

export const getUserById = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid user ID format", 400);
    }

    const user = await User.findById(id).select("-password");

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const taskStats = await Task.aggregate([
      { $match: { assignee: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = {
      todo: 0,
      "in-progress": 0,
      done: 0,
      total: 0,
    };

    taskStats.forEach((stat) => {
      stats[stat._id as keyof typeof stats] = stat.count;
      stats.total += stat.count;
    });

    const response: ApiResponse = {
      success: true,
      message: "User retrieved successfully",
      data: {
        user,
        taskStats: stats,
      },
    };

    res.status(200).json(response);
  },
);

export const updateUserRole = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid user ID format", 400);
    }

    if (req.user?._id.toString() === id) {
      throw new AppError("You cannot change your own role", 400);
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true },
    ).select("-password");

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const response: ApiResponse = {
      success: true,
      message: "User role updated successfully",
      data: { user },
    };

    res.status(200).json(response);
  },
);

export const deleteUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid user ID format", 400);
    }

    if (req.user?._id.toString() === id) {
      throw new AppError("You cannot delete your own account", 400);
    }

    const user = await User.findById(id);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const assignedTasks = await Task.countDocuments({ assignee: id });

    if (assignedTasks > 0) {
      throw new AppError(
        `Cannot delete user. They have ${assignedTasks} assigned task(s). Please reassign these tasks first.`,
        400,
      );
    }

    await User.findByIdAndDelete(id);

    const response: ApiResponse = {
      success: true,
      message: "User deleted successfully",
    };

    res.status(200).json(response);
  },
);

export const getUserDashboard = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    let userId = req.params.id || req.user?._id;

    if (!userId) {
      throw new AppError("User ID is required", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid user ID format", 400);
    }

    if (
      req.user?.role === UserRole.MEMBER &&
      req.user._id.toString() !== userId.toString()
    ) {
      throw new AppError(
        "Access denied. You can only access your own dashboard.",
        403,
      );
    }

    const user = await User.findById(userId).select("-password");

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const [taskStats, recentTasks, overdueTasks] = await Promise.all([
      Task.aggregate([
        { $match: { assignee: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalTasks: { $sum: 1 },
            todo: { $sum: { $cond: [{ $eq: ["$status", "todo"] }, 1, 0] } },
            inProgress: {
              $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] },
            },
            done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
            highPriority: {
              $sum: { $cond: [{ $eq: ["$priority", "high"] }, 1, 0] },
            },
            urgentPriority: {
              $sum: { $cond: [{ $eq: ["$priority", "urgent"] }, 1, 0] },
            },
          },
        },
      ]),
      Task.find({ assignee: userId })
        .sort({ updatedAt: -1 })
        .limit(5)
        .populate("createdBy", "firstName lastName"),
      Task.find({
        assignee: userId,
        dueDate: { $lt: new Date() },
        status: { $ne: "done" },
      }).sort({ dueDate: 1 }),
    ]);

    const stats = taskStats[0] || {
      totalTasks: 0,
      todo: 0,
      inProgress: 0,
      done: 0,
      highPriority: 0,
      urgentPriority: 0,
    };

    const response: ApiResponse = {
      success: true,
      message: "Dashboard data retrieved successfully",
      data: {
        user,
        stats,
        recentTasks,
        overdueTasks,
      },
    };

    res.status(200).json(response);
  },
);

export const bulkUpdateUsers = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { userIds, updates } = req.body;

    const validUserIds = userIds.filter((id: string) =>
      mongoose.Types.ObjectId.isValid(id),
    );

    if (validUserIds.length !== userIds.length) {
      throw new AppError("One or more user IDs are invalid", 400);
    }

    if (updates.role && userIds.includes(req.user?._id.toString())) {
      throw new AppError("You cannot change your own role", 400);
    }

    const result = await User.updateMany(
      { _id: { $in: validUserIds } },
      updates,
      { runValidators: true },
    );

    const response: ApiResponse = {
      success: true,
      message: `Successfully updated ${result.modifiedCount} user(s)`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
    };

    res.status(200).json(response);
  },
);
