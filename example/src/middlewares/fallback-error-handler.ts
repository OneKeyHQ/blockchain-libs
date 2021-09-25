import express from 'express';
import { StatusCodes } from 'http-status-codes';

export default (
  error: NodeJS.ErrnoException,
  req: express.Request,
  response: express.Response,
  next: express.NextFunction,
): void => {
  response.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    context: {
      error: String(error),
      trace: error.stack,
    },
  });
  next();
};
