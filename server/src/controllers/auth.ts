import { Response } from "express";
import { AuthenticatedRequest, AppError, ApiResponse } from "../types";
import User from "../models/User";
import { sendTokenResponse, clearTokenResponse } from "../utils/jwt";
import { asyncHandler } from "../utils/asyncHandler";

export const register = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { email, password, firstName, lastName, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError("User with this email already exists", 400);
    }

    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: role || "member",
    });

    sendTokenResponse(user, 201, res, "User registered successfully");
  },
);

export const login = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError("Invalid credentials", 401);
    }

    user.password = undefined as any;

    sendTokenResponse(user, 200, res, "Logged in successfully");
  },
);

export const logout = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    clearTokenResponse(res, "Logged out successfully");
  },
);

export const getProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("User not found", 404);
    }

    const response: ApiResponse = {
      success: true,
      message: "Profile retrieved successfully",
      data: { user: req.user },
    };

    res.status(200).json(response);
  },
);

export const updateProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("User not found", 404);
    }

    const { firstName, lastName } = req.body;

    const fieldsToUpdate: any = {};
    if (firstName !== undefined) fieldsToUpdate.firstName = firstName;
    if (lastName !== undefined) fieldsToUpdate.lastName = lastName;

    const user = await User.findByIdAndUpdate(req.user._id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    const response: ApiResponse = {
      success: true,
      message: "Profile updated successfully",
      data: { user },
    };

    res.status(200).json(response);
  },
);

export const changePassword = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("User not found", 404);
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AppError("Current password is incorrect", 400);
    }

    user.password = newPassword;
    await user.save();

    const response: ApiResponse = {
      success: true,
      message: "Password changed successfully",
    };

    res.status(200).json(response);
  },
);

export const verifyToken = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError("Token is invalid", 401);
    }

    const response: ApiResponse = {
      success: true,
      message: "Token is valid",
      data: { user: req.user },
    };

    res.status(200).json(response);
  },
);
