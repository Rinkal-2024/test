import mongoose, { Schema } from "mongoose";
import { ITask, TaskStatus, TaskPriority } from "../types";

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    status: {
      type: String,
      enum: {
        values: Object.values(TaskStatus),
        message: "Status must be todo, in-progress, or done",
      },
      default: TaskStatus.TODO,
    },
    priority: {
      type: String,
      enum: {
        values: Object.values(TaskPriority),
        message: "Priority must be low, medium, high, or urgent",
      },
      default: TaskPriority.MEDIUM,
    },
    dueDate: {
      type: Date,
      validate: {
        validator: function (value: Date) {
          return !value || value > new Date();
        },
        message: "Due date must be in the future",
      },
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function (tags: string[]) {
          return tags.length <= 10;
        },
        message: "Cannot have more than 10 tags",
      },
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Assignee is required"],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by is required"],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        return ret;
      },
    },
  },
);

taskSchema.index({ assignee: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ tags: 1 });
taskSchema.index({ title: "text", description: "text" }); 
taskSchema.index({ createdAt: -1 }); 

taskSchema.index({ assignee: 1, status: 1 });
taskSchema.index({ assignee: 1, priority: 1 });
taskSchema.index({ status: 1, dueDate: 1 });

taskSchema.virtual("isOverdue").get(function (this: any) {
  return (
    this.dueDate && this.dueDate < new Date() && this.status !== TaskStatus.DONE
  );
});

taskSchema.statics.findOverdue = function () {
  return this.find({
    dueDate: { $lt: new Date() },
    status: { $ne: TaskStatus.DONE },
  });
};

taskSchema.statics.findByAssignee = function (assigneeId: string) {
  return this.find({ assignee: assigneeId });
};

taskSchema.statics.searchTasks = function (searchTerm: string) {
  return this.find(
    {
      $text: { $search: searchTerm },
    },
    {
      score: { $meta: "textScore" },
    },
  ).sort({
    score: { $meta: "textScore" },
  });
};

taskSchema.pre("save", function (this: any, next) {
  this.tags = this.tags
    .map((tag: string) => tag.toLowerCase().trim())
    .filter(
      (tag: string, index: number, arr: string[]) =>
        tag && arr.indexOf(tag) === index,
    ); 

  next();
});

export default mongoose.model<ITask>("Task", taskSchema);
