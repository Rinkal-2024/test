import mongoose, { Schema } from "mongoose";
import { IActivityLog, ActivityAction } from "../types";

const activityLogSchema = new Schema<IActivityLog>(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: [true, "Task ID is required"],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    action: {
      type: String,
      enum: {
        values: Object.values(ActivityAction),
        message: "Action must be create, update, or delete",
      },
      required: [true, "Action is required"],
    },
    changes: {
      type: Schema.Types.Mixed,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false, 
    toJSON: {
      transform: function (doc, ret) {
        return ret;
      },
    },
  },
);

// Indexes for efficient querying
activityLogSchema.index({ taskId: 1, timestamp: -1 });
activityLogSchema.index({ userId: 1, timestamp: -1 });
activityLogSchema.index({ timestamp: -1 });

// Static methods
activityLogSchema.statics.logActivity = function (
  taskId: string,
  userId: string,
  action: ActivityAction,
  changes?: Record<string, any>,
) {
  return this.create({
    taskId,
    userId,
    action,
    changes: changes || null,
    timestamp: new Date(),
  });
};

activityLogSchema.statics.getTaskHistory = function (
  taskId: string,
  limit = 50,
) {
  return this.find({ taskId })
    .populate("userId", "firstName lastName email")
    .sort({ timestamp: -1 })
    .limit(limit);
};

activityLogSchema.statics.getUserActivity = function (
  userId: string,
  limit = 50,
) {
  return this.find({ userId })
    .populate("taskId", "title")
    .sort({ timestamp: -1 })
    .limit(limit);
};

export default mongoose.model<IActivityLog>("ActivityLog", activityLogSchema);
