export class AppError extends Error {
  public readonly statusCode: number;
  public readonly type: string;

  constructor(type: string, message: string, statusCode: number) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;

    Error.captureStackTrace(this, this.constructor);
  }
}
