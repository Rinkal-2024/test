import { Response } from "express";
import mongoose from "mongoose";
import {
  AuthenticatedRequest,
  AppError,
  ApiResponse,
  TaskStats,
  UserRole,
} from "../types";
import Task from "../models/Task";
import User from "../models/User";
import ActivityLog from "../models/ActivityLog";
import { asyncHandler } from "../utils/asyncHandler";

export const getOverviewStats = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const userId = req.user._id;
    const isAdmin = req.user.role === UserRole.ADMIN;

    const taskFilter = isAdmin ? {} : { assignee: userId };

    const [taskCounts, userCounts] = await Promise.all([
      Task.aggregate([
        { $match: taskFilter },
        {
          $group: {
            _id: null,
            totalTasks: { $sum: 1 },
            todoTasks: {
              $sum: { $cond: [{ $eq: ["$status", "todo"] }, 1, 0] },
            },
            inProgressTasks: {
              $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] },
            },
            doneTasks: {
              $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] },
            },
            lowPriority: {
              $sum: { $cond: [{ $eq: ["$priority", "low"] }, 1, 0] },
            },
            mediumPriority: {
              $sum: { $cond: [{ $eq: ["$priority", "medium"] }, 1, 0] },
            },
            highPriority: {
              $sum: { $cond: [{ $eq: ["$priority", "high"] }, 1, 0] },
            },
            urgentPriority: {
              $sum: { $cond: [{ $eq: ["$priority", "urgent"] }, 1, 0] },
            },
            overdueTasks: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $lt: ["$dueDate", new Date()] },
                      { $ne: ["$status", "done"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      isAdmin ? User.countDocuments({}) : Promise.resolve(0),
    ]);

    const stats = taskCounts[0] || {
      totalTasks: 0,
      todoTasks: 0,
      inProgressTasks: 0,
      doneTasks: 0,
      lowPriority: 0,
      mediumPriority: 0,
      highPriority: 0,
      urgentPriority: 0,
      overdueTasks: 0,
    };

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyStats = await Task.aggregate([
      {
        $match: {
          ...taskFilter,
          $or: [
            { createdAt: { $gte: oneWeekAgo } },
            { updatedAt: { $gte: oneWeekAgo }, status: "done" },
          ],
        },
      },
      {
        $group: {
          _id: null,
          tasksCreatedThisWeek: {
            $sum: { $cond: [{ $gte: ["$createdAt", oneWeekAgo] }, 1, 0] },
          },
          tasksCompletedThisWeek: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "done"] },
                    { $gte: ["$updatedAt", oneWeekAgo] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const weeklyData = weeklyStats[0] || {
      tasksCreatedThisWeek: 0,
      tasksCompletedThisWeek: 0,
    };

    const response: ApiResponse = {
      success: true,
      message: "Overview statistics retrieved successfully",
      data: {
        taskStats: {
          total: stats.totalTasks,
          byStatus: {
            todo: stats.todoTasks,
            "in-progress": stats.inProgressTasks,
            done: stats.doneTasks,
          },
          byPriority: {
            low: stats.lowPriority,
            medium: stats.mediumPriority,
            high: stats.highPriority,
            urgent: stats.urgentPriority,
          },
          overdue: stats.overdueTasks,
          weeklyTrends: {
            created: weeklyData.tasksCreatedThisWeek,
            completed: weeklyData.tasksCompletedThisWeek,
          },
        },
        ...(isAdmin && { totalUsers: userCounts }),
      },
    };

    res.status(200).json(response);
  },
);

export const getTaskAnalytics = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const userId = req.user._id;
    const isAdmin = req.user.role === UserRole.ADMIN;
    const taskFilter = isAdmin ? {} : { assignee: userId };

    const tagAnalytics = await Task.aggregate([
      { $match: taskFilter },
      { $unwind: "$tags" },
      {
        $group: {
          _id: "$tags",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrends = await Task.aggregate([
      {
        $match: {
          ...taskFilter,
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalCreated: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const completedTasks = await Task.find({
      ...taskFilter,
      status: "done",
      updatedAt: { $gte: sixMonthsAgo },
    })
      .select("createdAt updatedAt")
      .limit(100);

    let avgCompletionTime = 0;
    if (completedTasks.length > 0) {
      const totalTime = completedTasks.reduce((sum, task) => {
        return sum + (task.updatedAt.getTime() - task.createdAt.getTime());
      }, 0);
      avgCompletionTime = Math.round(
        totalTime / completedTasks.length / (1000 * 60 * 60),
      );
    }

    const response: ApiResponse = {
      success: true,
      message: "Task analytics retrieved successfully",
      data: {
        tagDistribution: tagAnalytics,
        monthlyTrends: monthlyTrends.map((trend) => ({
          month: `${trend._id.year}-${String(trend._id.month).padStart(2, "0")}`,
          created: trend.totalCreated,
          completed: trend.completed,
          completionRate:
            trend.totalCreated > 0
              ? Math.round((trend.completed / trend.totalCreated) * 100)
              : 0,
        })),
        avgCompletionTimeHours: avgCompletionTime,
        analyticsDate: new Date(),
      },
    };

    res.status(200).json(response);
  },
);


export const getTeamPerformance = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const userStats = await Task.aggregate([
      {
        $group: {
          _id: "$assignee",
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] },
          },
          inProgressTasks: {
            $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] },
          },
          overdueTasks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ["$dueDate", new Date()] },
                    { $ne: ["$status", "done"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          userId: "$_id",
          firstName: "$user.firstName",
          lastName: "$user.lastName",
          email: "$user.email",
          totalTasks: 1,
          completedTasks: 1,
          inProgressTasks: 1,
          overdueTasks: 1,
          completionRate: {
            $cond: [
              { $gt: ["$totalTasks", 0] },
              {
                $multiply: [
                  { $divide: ["$completedTasks", "$totalTasks"] },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { completionRate: -1 } },
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activitySummary = await ActivityLog.aggregate([
      {
        $match: {
          timestamp: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 },
        },
      },
    ]);

    const response: ApiResponse = {
      success: true,
      message: "Team performance retrieved successfully",
      data: {
        userPerformance: userStats,
        teamSummary: {
          totalMembers: userStats.length,
          avgCompletionRate:
            userStats.length > 0
              ? Math.round(
                  userStats.reduce(
                    (sum, user) => sum + user.completionRate,
                    0,
                  ) / userStats.length,
                )
              : 0,
          totalOverdueTasks: userStats.reduce(
            (sum, user) => sum + user.overdueTasks,
            0,
          ),
        },
        activitySummary: {
          last30Days: activitySummary.reduce(
            (acc, activity) => {
              acc[activity._id] = activity.count;
              return acc;
            },
            {} as Record<string, number>,
          ),
        },
      },
    };

    res.status(200).json(response);
  },
);

export const getSystemHealth = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const [userCount, taskCount, activityLogCount] = await Promise.all([
      User.countDocuments({}),
      Task.countDocuments({}),
      ActivityLog.countDocuments({}),
    ]);

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const recentActivity = await ActivityLog.countDocuments({
      timestamp: { $gte: oneDayAgo },
    });

    const [oldestTask, newestTask] = await Promise.all([
      Task.findOne({}).sort({ createdAt: 1 }).select("createdAt"),
      Task.findOne({}).sort({ createdAt: -1 }).select("createdAt"),
    ]);

    const taskDataHealth = {
      totalTasks: taskCount,
      tasksWithDueDate: await Task.countDocuments({
        dueDate: { $exists: true, $ne: null },
      }),
      tasksWithTags: await Task.countDocuments({
        tags: { $exists: true, $not: { $size: 0 } },
      }),
      tasksWithDescription: await Task.countDocuments({
        description: { $exists: true, $ne: "" },
      }),
    };

    const response: ApiResponse = {
      success: true,
      message: "System health retrieved successfully",
      data: {
        systemMetrics: {
          users: userCount,
          tasks: taskCount,
          activityLogs: activityLogCount,
          recentActivity24h: recentActivity,
        },
        dataHealth: {
          tasks: {
            total: taskDataHealth.totalTasks,
            withDueDate: taskDataHealth.tasksWithDueDate,
            withTags: taskDataHealth.tasksWithTags,
            withDescription: taskDataHealth.tasksWithDescription,
            completenessScore:
              taskDataHealth.totalTasks > 0
                ? Math.round(
                    ((taskDataHealth.tasksWithDueDate +
                      taskDataHealth.tasksWithTags +
                      taskDataHealth.tasksWithDescription) /
                      (taskDataHealth.totalTasks * 3)) *
                      100,
                  )
                : 100,
          },
        },
        systemInfo: {
          oldestTaskDate: oldestTask?.createdAt,
          newestTaskDate: newestTask?.createdAt,
          serverUptime: process.uptime(),
          timestamp: new Date(),
        },
      },
    };

    res.status(200).json(response);
  },
);
