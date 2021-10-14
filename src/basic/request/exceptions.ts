import { Response } from 'cross-fetch';

class ResponseError extends Error {
  readonly response?: Response;

  constructor(message?: string, response?: Response) {
    super(message);
    this.response = response;
  }
}

class JsonPRCResponseError extends ResponseError {
  readonly error?: unknown;

  constructor(message?: string, response?: Response, error?: unknown) {
    super(message, response);
    this.error = error;
  }
}

export { ResponseError, JsonPRCResponseError };
