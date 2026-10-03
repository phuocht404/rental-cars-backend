import { ArgumentsHost, Catch, HttpStatus, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

// Chuyển lỗi Prisma thành mã HTTP có nghĩa thay vì để rơi xuống 500
const PRISMA_ERROR_MAP: Record<string, { status: number; message: string }> = {
  P2002: { status: HttpStatus.CONFLICT, message: 'Dữ liệu đã tồn tại' },
  P2003: { status: HttpStatus.CONFLICT, message: 'Dữ liệu đang được sử dụng ở nơi khác' },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'Không tìm thấy dữ liệu' },
  P2034: { status: HttpStatus.CONFLICT, message: 'Dữ liệu đang được cập nhật, vui lòng thử lại' },
};

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Dữ liệu gửi lên không hợp lệ',
        error: 'Bad Request',
      });
    }

    const mapped = PRISMA_ERROR_MAP[exception.code];

    if (!mapped) {
      this.logger.error(`Prisma error ${exception.code}`, exception.stack);
      return super.catch(exception, host);
    }

    return response.status(mapped.status).json({
      statusCode: mapped.status,
      message: mapped.message,
      error: HttpStatus[mapped.status],
    });
  }
}
