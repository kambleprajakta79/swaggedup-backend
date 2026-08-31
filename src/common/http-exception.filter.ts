import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';
    if (exception instanceof HttpException) {
      const resContent = exception.getResponse();
      if (typeof resContent === 'object' && resContent !== null) {
        // Handle validation messages from NestJS ValidationPipe
        const validationMessage = (resContent as any).message;
        message = Array.isArray(validationMessage)
          ? validationMessage.join(', ')
          : validationMessage || exception.message;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Never expose stack trace in response
    response.status(status).json({
      success: false,
      message,
      statusCode: status,
    });
  }
}
