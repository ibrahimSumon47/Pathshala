import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
    details?: string[];
  };
};

type ErrorDescription = {
  status: number;
  code: string;
  message: string;
  details?: string[];
};

const STATUS_CODES: Record<number, string> = {
  400: 'bad_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  405: 'method_not_allowed',
  409: 'conflict',
  422: 'unprocessable_entity',
  429: 'rate_limited',
  500: 'internal_error',
  503: 'service_unavailable',
};

function codeFor(status: number): string {
  return STATUS_CODES[status] ?? (status >= 500 ? 'internal_error' : 'request_failed');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function describe(exception: unknown): ErrorDescription {
  if (!(exception instanceof HttpException)) {
    return { status: 500, code: 'internal_error', message: 'Something went wrong.' };
  }

  const status = exception.getStatus();
  const payload = exception.getResponse();

  if (typeof payload === 'string') {
    return { status, code: codeFor(status), message: payload };
  }

  if (isRecord(payload)) {
    if (typeof payload.code === 'string' && typeof payload.message === 'string') {
      return {
        status,
        code: payload.code,
        message: payload.message,
        ...(Array.isArray(payload.details) ? { details: payload.details.map(String) } : {}),
      };
    }

    if (Array.isArray(payload.message)) {
      return {
        status,
        code: 'validation_failed',
        message: 'The request is not valid.',
        details: payload.message.map(String),
      };
    }

    if (typeof payload.message === 'string') {
      return { status, code: codeFor(status), message: payload.message };
    }
  }

  return { status, code: codeFor(status), message: exception.message };
}

/** Every error leaves the API as { error: { code, message, details? } }. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, code, message, details } = describe(exception);

    if (status >= 500) {
      this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    }

    const body: ErrorEnvelope = {
      error: { code, message, ...(details ? { details } : {}) },
    };
    response.status(status).json(body);
  }
}
