import { Router } from "express";
import {
  getUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getUserDashboard,
  bulkUpdateUsers,
} from "../controllers/users";
import {
  authenticate,
  requireAdmin,
  requireOwnershipOrAdmin,
} from "../middleware/auth";
import { handleValidationErrors } from "../middleware/validation";
import {
  getUsersValidation,
  userIdValidation,
  updateUserRoleValidation,
  bulkUpdateUsersValidation,
  dashboardValidation,
} from "../validation/user";

const router = Router();

router.use(authenticate);

router.get(
  "/dashboard",
  dashboardValidation,
  handleValidationErrors,
  getUserDashboard,
);
router.get(
  "/dashboard/:id",
  requireOwnershipOrAdmin("id"),
  dashboardValidation,
  handleValidationErrors,
  getUserDashboard,
);

router.use(requireAdmin);

router.get("/", getUsersValidation, handleValidationErrors, getUsers);
router.get("/:id", userIdValidation, handleValidationErrors, getUserById);
router.patch(
  "/:id/role",
  updateUserRoleValidation,
  handleValidationErrors,
  updateUserRole,
);
router.delete("/:id", userIdValidation, handleValidationErrors, deleteUser);


router.patch(
  "/bulk",
  bulkUpdateUsersValidation,
  handleValidationErrors,
  bulkUpdateUsers,
);

export default router;
