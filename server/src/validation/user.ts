import { body, query, param, ValidationChain } from "express-validator";
import { UserRole } from "../types";

export const getUsersValidation = [
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

  query("role")
    .optional()
    .isIn(Object.values(UserRole))
    .withMessage(
      `Role must be one of: ${Object.values(UserRole).join(", ")}`,
    ),

  query("sortBy")
    .optional()
    .isIn([
      "firstName",
      "lastName",
      "email",
      "role",
      "createdAt",
      "updatedAt",
    ])
    .withMessage(
      "Sort by must be one of: firstName, lastName, email, role, createdAt, updatedAt",
    ),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be either asc or desc"),
];

export const userIdValidation = [
  param("id")
    .isMongoId()
    .withMessage("User ID must be a valid MongoDB ObjectId"),
];

export const updateUserRoleValidation = [
  param("id")
    .isMongoId()
    .withMessage("User ID must be a valid MongoDB ObjectId"),

  body("role")
    .isIn(Object.values(UserRole))
    .withMessage(
      `Role must be one of: ${Object.values(UserRole).join(", ")}`,
    ),
];

export const bulkUpdateUsersValidation = [
  body("userIds")
    .isArray({ min: 1, max: 50 })
    .withMessage("User IDs must be an array with 1-50 items")
    .custom((userIds) => {
      if (userIds.some((id: any) => !id.match(/^[0-9a-fA-F]{24}$/))) {
        throw new Error("All user IDs must be valid MongoDB ObjectIds");
      }
      return true;
    }),

  body("updates")
    .isObject()
    .withMessage("Updates must be an object")
    .custom((updates) => {
      const allowedFields = ["role"];
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

  body("updates.role")
    .optional()
    .isIn(Object.values(UserRole))
    .withMessage(
      `Role must be one of: ${Object.values(UserRole).join(", ")}`,
    ),
];

export const dashboardValidation: ValidationChain[] = [
  param("id")
    .optional()
    .isMongoId()
    .withMessage("User ID must be a valid MongoDB ObjectId"),
]; 