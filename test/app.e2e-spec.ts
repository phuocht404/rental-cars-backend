import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';

import { AppModule } from './../src/app.module';

// Cần một database thật (DATABASE_URL trong .env.local) nên chỉ chạy khi bật E2E=1
const describeE2E = process.env.E2E === '1' ? describe : describe.skip;

describeE2E('API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /cars/newest/cars là public', () => {
    return request(app.getHttpServer()).get('/api/v1/cars/newest/cars').expect(200);
  });

  it('GET /auth/me cần đăng nhập', () => {
    return request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  it('POST /stripe/checkout cần đăng nhập', () => {
    return request(app.getHttpServer()).post('/api/v1/stripe/checkout').send({ items: [] }).expect(401);
  });

  it('POST /auth/signin validate dữ liệu', () => {
    return request(app.getHttpServer()).post('/api/v1/auth/signin').send({ username: '' }).expect(400);
  });
});
