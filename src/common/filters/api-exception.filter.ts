import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

type ErrorResponse = {
  statusCode: number;
  code: string;
  message: string;
  timestamp: string;
  path: string;
  details?: unknown;
};

type HttpExceptionBody = {
  code?: string;
  message?: string | string[];
  error?: string;
  details?: unknown;
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status = this.resolveStatus(exception);
    const body = this.buildResponse(exception, status, request);

    if (status >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `Unhandled API error on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json(body);
  }

  private resolveStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HTTP_STATUS.INTERNAL_SERVER_ERROR;
  }

  private buildResponse(
    exception: unknown,
    status: number,
    request: Request,
  ): ErrorResponse {
    const exceptionBody = this.getHttpExceptionBody(exception);
    const isValidationError = exceptionBody?.code === 'VALIDATION_ERROR';

    const errorResponse: ErrorResponse = {
      statusCode: status,
      code: isValidationError
        ? 'VALIDATION_ERROR'
        : this.errorCodeForStatus(status),
      message: isValidationError
        ? 'Request validation failed'
        : this.messageForStatus(status, exceptionBody),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (isValidationError && exceptionBody?.details) {
      errorResponse.details = exceptionBody.details;
    }

    return errorResponse;
  }

  private getHttpExceptionBody(exception: unknown): HttpExceptionBody | null {
    if (!(exception instanceof HttpException)) {
      return null;
    }

    const response = exception.getResponse();
    return typeof response === 'object' && response !== null
      ? (response as HttpExceptionBody)
      : { message: String(response) };
  }

  private errorCodeForStatus(status: number): string {
    switch (status) {
      case HTTP_STATUS.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HTTP_STATUS.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HTTP_STATUS.FORBIDDEN:
        return 'FORBIDDEN';
      case HTTP_STATUS.NOT_FOUND:
        return 'NOT_FOUND';
      case HTTP_STATUS.TOO_MANY_REQUESTS:
        return 'RATE_LIMITED';
      default:
        return status >= HTTP_STATUS.INTERNAL_SERVER_ERROR
          ? 'INTERNAL_ERROR'
          : 'HTTP_ERROR';
    }
  }

  private messageForStatus(
    status: number,
    exceptionBody: HttpExceptionBody | null,
  ): string {
    switch (status) {
      case HTTP_STATUS.UNAUTHORIZED:
        return 'Authentication failed';
      case HTTP_STATUS.FORBIDDEN:
        return 'Access denied';
      case HTTP_STATUS.NOT_FOUND:
        return 'Resource not found';
      case HTTP_STATUS.TOO_MANY_REQUESTS:
        return 'Too many requests';
      case HTTP_STATUS.INTERNAL_SERVER_ERROR:
        return 'Internal server error';
      default:
        return this.safeHttpMessage(exceptionBody);
    }
  }

  private safeHttpMessage(exceptionBody: HttpExceptionBody | null): string {
    const message = exceptionBody?.message;

    if (Array.isArray(message)) {
      return 'Request validation failed';
    }

    return message || exceptionBody?.error || 'Request failed';
  }
}
