import { Logger, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

// "1" (mặc định) = tin 1 proxy, "false" = không tin proxy nào, hoặc danh sách IP/subnet, "loopback"...
const parseTrustProxy = (value?: string): boolean | number | string => {
  if (value === undefined || value === '') return 1;
  if (value === 'true' || value === 'false') return value === 'true';

  return /^\d+$/.test(value) ? Number(value) : value;
};

async function bootstrap() {
  const PORT = parseInt(process.env.PORT || '8080', 10);
  const HOSTNAME = process.env.HOSTNAME || '0.0.0.0';

  // Tự cấu hình body parser bên dưới để giữ lại body gốc (rawBody) cho việc xác thực webhook Stripe
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
  // Số proxy đứng trước backend (Nginx, load balancer...) để Express lấy đúng IP thật cho rate limit.
  // Proxy ngoài cùng PHẢI ghi đè X-Forwarded-For (không nối thêm), nếu không client có thể tự giả IP.
  app.getHttpAdapter().getInstance().set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));

  app.use(helmet());
  app.use(compression());
  // Ảnh được upload thẳng lên Cloudinary/multipart, body JSON chỉ chứa dữ liệu nhỏ
  app.use(
    json({
      limit: '1mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  app.enableCors({
    origin: (process.env.CLIENT_URL || 'http://localhost:3000').split(','),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
  });

  // whitelist: bỏ mọi field không khai báo trong DTO (chặn mass assignment)
  // transform: tự ép kiểu query/param (page, limit, id...) theo kiểu khai báo
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new PrismaExceptionFilter(httpAdapter));

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Rental Cars APIs')
      .setDescription('APIs for Rental Cars project with NestJS.')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('access_token')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/v1/docs', app, document);
  }

  await app.listen(PORT, HOSTNAME);
  Logger.log(`Application is running on: ${await app.getUrl()}`, 'Bootstrap');
}

bootstrap();
