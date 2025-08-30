import { Router } from "express";
import {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  verifyToken,
} from "../controllers/auth";
import { authenticate } from "../middleware/auth";
import { handleValidationErrors } from "../middleware/validation";
import {
  registerValidation,
  loginValidation,
  changePasswordValidation,
  updateProfileValidation,
} from "../validation/auth";

const router = Router();

router.post("/register", registerValidation, handleValidationErrors, register);
router.post("/login", loginValidation, handleValidationErrors, login);
router.post("/logout", logout);

router.use(authenticate);

router.get("/profile", getProfile);

router.patch(
  "/profile",
  updateProfileValidation,
  handleValidationErrors,
  updateProfile,
);
router.post(
  "/change-password",
  changePasswordValidation,
  handleValidationErrors,
  changePassword,
);
router.get("/verify", verifyToken);

export default router;
