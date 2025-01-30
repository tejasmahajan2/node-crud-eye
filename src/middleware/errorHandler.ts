import { Request, Response, NextFunction } from 'express';
import { AppError } from '../common/utils/AppError';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      type: err.type,
      message: err.message,
    });
  }

  // Default to 500 server error
  res.status(500).json({
    type: 'INTERNAL_SERVER_ERROR',
    message: err.message || 'Something went wrong',
  });
};
