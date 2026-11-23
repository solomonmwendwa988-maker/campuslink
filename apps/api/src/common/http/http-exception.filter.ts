import { Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { Request, Response } from 'express';


export interface SafeHttpErrorPayload {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
  requestId: string;
}


export function safeHttpErrorPayload(statusCode: number, rawMessage: unknown, path: string, requestId: string): SafeHttpErrorPayload {
  const message = statusCode >= 500
    ? 'Internal server error'
    : (typeof rawMessage === 'string' || (Array.isArray(rawMessage) && rawMessage.every((v) => typeof v === 'string'))
      ? rawMessage as string | string[]
      : 'Request failed');
  const safePath = path.split('?')[0] || '/';
  return {
    statusCode,
    error: statusCode >= 500 ? 'Internal Server Error' : statusCode === 400 ? 'Bad Request' : statusCode === 401 ? 'Unauthorized' : statusCode === 403 ? 'Forbidden' : statusCode === 404 ? 'Not Found' : 'Request Error',
    message,
    timestamp: new Date().toISOString(),
    path: safePath,
    requestId,
  };
}


@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);


  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const requestId = String(res.locals?.requestId ?? 'unassigned');
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    let rawMessage: unknown = undefined;
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      rawMessage = typeof response === 'string' ? response : (response as { message?: unknown })?.message;
    }
    const payload = safeHttpErrorPayload(status, rawMessage, req.originalUrl || req.url || '/', requestId);
    if (status >= 500) {
      const exceptionName = exception instanceof Error ? exception.name : 'UnknownError';
      this.logger.error(`Unhandled request failure requestId=${requestId} method=${req.method} path=${payload.path} type=${exceptionName}`);
    }
    res.status(status).json(payload);
  }
}
