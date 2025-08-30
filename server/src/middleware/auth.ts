import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest, AppError, UserRole, IUser } from "../types";
import User from "../models/User";

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    let token: string | undefined;

    if (req.cookies?.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(new AppError("Access denied. No token provided.", 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return next(new AppError("Token is valid but user no longer exists.", 401));
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError("Token expired.", 401));
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError("Invalid token.", 401));
    }
    next(error); 
  }
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    throw new AppError("Authentication required.", 401);
  }

  if (req.user.role !== UserRole.ADMIN) {
    throw new AppError("Access denied. Admin privileges required.", 403);
  }

  next();
};

export const requireOwnershipOrAdmin = (userIdField = "id") => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError("Authentication required.", 401);
    }

    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    const resourceUserId = req.params[userIdField] || req.body[userIdField];
    if (resourceUserId && resourceUserId !== req.user._id.toString()) {
      throw new AppError(
        "Access denied. You can only access your own resources.",
        403,
      );
    }

    next();
  };
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    let token: string | undefined;

    if (req.cookies?.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        userId: string;
      };
      const user = await User.findById(decoded.userId).select("-password");
      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    next();
  }
};
