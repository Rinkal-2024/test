import { Request, Response, NextFunction } from "express";
import { AppError } from "../types";

export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let isOperational = false;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    isOperational = error.isOperational;
  }

  else if (error.name === "ValidationError") {
    statusCode = 400;
    message = "Validation Error";
    const validationErrors = Object.values((error as any).errors).map(
      (err: any) => err.message,
    );
    message = validationErrors.join(", ");
    isOperational = true;
  }

  else if ((error as any).code === 11000) {
    statusCode = 400;
    const field = Object.keys((error as any).keyValue)[0];
    message = `${field} already exists`;
    isOperational = true;
  }

  else if (error.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format";
    isOperational = true;
  }

  else if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
    isOperational = true;
  }

  else if (error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
    isOperational = true;
  }

  if (!isOperational || process.env.NODE_ENV === "development") {
    console.error("Error Details:", {
      message: error.message,
      stack: error.stack,
      statusCode,
      isOperational,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
};
