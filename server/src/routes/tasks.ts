import { Router } from "express";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  bulkUpdateTasks,
  getOverdueTasks,
  getTasksByAssignee,
} from "../controllers/tasks";
import {
  authenticate,
  requireAdmin,
  requireOwnershipOrAdmin,
} from "../middleware/auth";
import { handleValidationErrors } from "../middleware/validation";
import {
  createTaskValidation,
  updateTaskValidation,
  getTasksValidation,
  taskIdValidation,
  bulkUpdateValidation,
} from "../validation/task";

const router = Router();

router.use(authenticate);

router.get("/", getTasksValidation, handleValidationErrors, getTasks);
router.post("/", createTaskValidation, handleValidationErrors, createTask);
router.get("/overdue", getOverdueTasks);

router.patch(
  "/bulk",
  requireAdmin,
  bulkUpdateValidation,
  handleValidationErrors,
  bulkUpdateTasks,
);

router.get("/assignee/:assigneeId", requireAdmin, getTasksByAssignee);

router.get("/:id", taskIdValidation, handleValidationErrors, getTaskById);
router.patch("/:id", updateTaskValidation, handleValidationErrors, updateTask);
router.delete("/:id", taskIdValidation, handleValidationErrors, deleteTask);

export default router;
