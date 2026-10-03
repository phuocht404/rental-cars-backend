import { AppThrottlerGuard } from './app-throttler.guard';

const contextWith = (headers: Record<string, string>) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ headers }) }) }) as any;

describe('AppThrottlerGuard.shouldSkip', () => {
  const guard = Object.create(AppThrottlerGuard.prototype) as AppThrottlerGuard;
  const shouldSkip = (headers: Record<string, string>) => (guard as any).shouldSkip(contextWith(headers));

  afterEach(() => {
    delete process.env.INTERNAL_API_KEY;
  });

  it('bỏ qua rate limit khi khoá nội bộ đúng', async () => {
    process.env.INTERNAL_API_KEY = 'secret-key';
    await expect(shouldSkip({ 'x-internal-key': 'secret-key' })).resolves.toBe(true);
  });

  it('vẫn rate limit khi khoá sai hoặc thiếu', async () => {
    process.env.INTERNAL_API_KEY = 'secret-key';
    await expect(shouldSkip({ 'x-internal-key': 'wrong-key!' })).resolves.toBe(false);
    await expect(shouldSkip({})).resolves.toBe(false);
  });

  it('không bỏ qua khi chưa cấu hình khoá', async () => {
    await expect(shouldSkip({ 'x-internal-key': '' })).resolves.toBe(false);
  });
});
