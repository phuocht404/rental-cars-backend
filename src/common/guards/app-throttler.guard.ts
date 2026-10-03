import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { timingSafeEqual } from 'crypto';

const INTERNAL_KEY_HEADER = 'x-internal-key';

const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
};

/**
 * Server Next.js (SSR, sitemap, proxy làm mới token) gọi API thay cho rất nhiều người dùng nhưng
 * luôn từ cùng một IP. Nếu đếm chung, toàn bộ website sẽ bị 429 khi có lượng truy cập vừa phải.
 * Các request nội bộ mang khoá bí mật dùng chung thì được bỏ qua rate limit.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const expected = process.env.INTERNAL_API_KEY;
    if (!expected) return false;

    const provided = context.switchToHttp().getRequest().headers?.[INTERNAL_KEY_HEADER];

    return typeof provided === 'string' && safeEqual(provided, expected);
  }
}
