import { body, query, param } from "express-validator";
import { TaskStatus, TaskPriority } from "../types";

export const createTaskValidation = [
  body("title")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Title is required and must be between 1 and 200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),

  body("status")
    .optional()
    .isIn(Object.values(TaskStatus))
    .withMessage(
      `Status must be one of: ${Object.values(TaskStatus).join(", ")}`,
    ),

  body("priority")
    .optional()
    .isIn(Object.values(TaskPriority))
    .withMessage(
      `Priority must be one of: ${Object.values(TaskPriority).join(", ")}`,
    ),

  body("dueDate")
    .optional()
    .isISO8601()
    .withMessage("Due date must be a valid ISO 8601 date")
    .custom((value) => {
      if (value && new Date(value) <= new Date()) {
        throw new Error("Due date must be in the future");
      }
      return true;
    }),

  body("tags")
    .optional()
    .isArray({ max: 10 })
    .withMessage("Tags must be an array with maximum 10 items")
    .custom((tags) => {
      if (
        tags &&
        tags.some(
          (tag: any) => typeof tag !== "string" || tag.trim().length === 0,
        )
      ) {
        throw new Error("All tags must be non-empty strings");
      }
      return true;
    }),

  body("assignee").isMongoId().withMessage("Assignee must be a valid user ID"),
];

export const updateTaskValidation = [
  param("id")
    .isMongoId()
    .withMessage("Task ID must be a valid MongoDB ObjectId"),

  body("title")
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Title must be between 1 and 200 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),

  body("status")
    .optional()
    .isIn(Object.values(TaskStatus))
    .withMessage(
      `Status must be one of: ${Object.values(TaskStatus).join(", ")}`,
    ),

  body("priority")
    .optional()
    .isIn(Object.values(TaskPriority))
    .withMessage(
      `Priority must be one of: ${Object.values(TaskPriority).join(", ")}`,
    ),

  body("dueDate")
    .optional()
    .custom((value) => {
      if (value === null) return true; 
      if (!value) return true; 

      if (!Date.parse(value)) {
        throw new Error("Due date must be a valid ISO 8601 date");
      }

      if (new Date(value) <= new Date()) {
        throw new Error("Due date must be in the future");
      }

      return true;
    }),

  body("tags")
    .optional()
    .isArray({ max: 10 })
    .withMessage("Tags must be an array with maximum 10 items")
    .custom((tags) => {
      if (
        tags &&
        tags.some(
          (tag: any) => typeof tag !== "string" || tag.trim().length === 0,
        )
      ) {
        throw new Error("All tags must be non-empty strings");
      }
      return true;
    }),

  body("assignee")
    .optional()
    .isMongoId()
    .withMessage("Assignee must be a valid user ID"),
];

export const getTasksValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("search")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search term must be between 1 and 100 characters"),

  query("status")
    .optional()
    .isIn(Object.values(TaskStatus))
    .withMessage(
      `Status must be one of: ${Object.values(TaskStatus).join(", ")}`,
    ),

  query("priority")
    .optional()
    .isIn(Object.values(TaskPriority))
    .withMessage(
      `Priority must be one of: ${Object.values(TaskPriority).join(", ")}`,
    ),

  query("assignee")
    .optional()
    .isMongoId()
    .withMessage("Assignee must be a valid user ID"),

  query("tags")
    .optional()
    .custom((value) => {
      if (typeof value === "string") {
        // Single tag
        return true;
      }
      if (Array.isArray(value)) {
        // Multiple tags
        if (value.length > 10) {
          throw new Error("Cannot filter by more than 10 tags");
        }
        return true;
      }
      throw new Error("Tags must be a string or array of strings");
    }),

  query("dueDateFrom")
    .optional()
    .isISO8601()
    .withMessage("Due date from must be a valid ISO 8601 date"),

  query("dueDateTo")
    .optional()
    .isISO8601()
    .withMessage("Due date to must be a valid ISO 8601 date"),

  query("sortBy")
    .optional()
    .isIn(["title", "status", "priority", "dueDate", "createdAt", "updatedAt"])
    .withMessage(
      "Sort by must be one of: title, status, priority, dueDate, createdAt, updatedAt",
    ),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be either asc or desc"),
];

export const taskIdValidation = [
  param("id")
    .isMongoId()
    .withMessage("Task ID must be a valid MongoDB ObjectId"),
];

export const bulkUpdateValidation = [
  body("taskIds")
    .isArray({ min: 1, max: 50 })
    .withMessage("Task IDs must be an array with 1-50 items")
    .custom((taskIds) => {
      if (taskIds.some((id: any) => !id.match(/^[0-9a-fA-F]{24}$/))) {
        throw new Error("All task IDs must be valid MongoDB ObjectIds");
      }
      return true;
    }),

  body("updates")
    .isObject()
    .withMessage("Updates must be an object")
    .custom((updates) => {
      const allowedFields = ["status", "priority", "assignee", "tags"];
      const updateFields = Object.keys(updates);

      if (updateFields.length === 0) {
        throw new Error("At least one update field is required");
      }

      const invalidFields = updateFields.filter(
        (field) => !allowedFields.includes(field),
      );
      if (invalidFields.length > 0) {
        throw new Error(`Invalid update fields: ${invalidFields.join(", ")}`);
      }

      return true;
    }),

  body("updates.status")
    .optional()
    .isIn(Object.values(TaskStatus))
    .withMessage(
      `Status must be one of: ${Object.values(TaskStatus).join(", ")}`,
    ),

  body("updates.priority")
    .optional()
    .isIn(Object.values(TaskPriority))
    .withMessage(
      `Priority must be one of: ${Object.values(TaskPriority).join(", ")}`,
    ),

  body("updates.assignee")
    .optional()
    .isMongoId()
    .withMessage("Assignee must be a valid user ID"),

  body("updates.tags")
    .optional()
    .isArray({ max: 10 })
    .withMessage("Tags must be an array with maximum 10 items")
    .custom((tags) => {
      if (
        tags &&
        tags.some(
          (tag: any) => typeof tag !== "string" || tag.trim().length === 0,
        )
      ) {
        throw new Error("All tags must be non-empty strings");
      }
      return true;
    }),
];
