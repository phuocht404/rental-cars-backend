// Kiểm tra biến môi trường ngay khi khởi động để không chạy với cấu hình thiếu (ví dụ thiếu secret của JWT)
const REQUIRED_KEYS = [
  'DATABASE_URL',
  'ACCESS_TOKEN_SECRET',
  'REFRESH_TOKEN_SECRET',
  'STRIPE_SECRET_KEY',
  'CLIENT_URL',
];

export function validateEnv(config: Record<string, unknown>) {
  const missing = REQUIRED_KEYS.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(`Thiếu biến môi trường: ${missing.join(', ')}`);
  }

  if (config.ACCESS_TOKEN_SECRET === config.REFRESH_TOKEN_SECRET) {
    throw new Error('ACCESS_TOKEN_SECRET và REFRESH_TOKEN_SECRET phải khác nhau');
  }

  if (config.PORT !== undefined && Number.isNaN(Number(config.PORT))) {
    throw new Error('PORT phải là số');
  }

  if (config.NODE_ENV === 'production' && !config.INTERNAL_API_KEY) {
    // Không chặn khởi động, nhưng thiếu khoá này thì mọi request SSR từ Next bị tính chung một IP
    console.warn('[env] INTERNAL_API_KEY chưa được đặt: request từ server Next.js sẽ bị rate limit chung một IP');
  }

  return config;
}
