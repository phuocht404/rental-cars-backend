import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';

import { AppModule } from './app.module';

async function bootstrap() {
  // variables
  const PORT = parseInt(process.env.PORT);
  const HOSTNAME = process.env.HOSTNAME;

  const app = await NestFactory.create(AppModule);

  // Server
  app.setGlobalPrefix('api/v1');
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Config Cookie
  app.use(cookieParser());

  // Config CORS
  app.enableCors({
    origin: (process.env.CLIENT_URL || 'http://localhost:3000').split(','),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
  });

  // Config Validation
  app.useGlobalPipes(new ValidationPipe());

  // Config Swagger
  const config = new DocumentBuilder()
    .setTitle('Rental Cars APIs')
    .setDescription('APIs for Rental Cars project with NestJS.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document);

  await app.listen(PORT, HOSTNAME, async () => {
    console.log(`Application is running on: ${await app.getUrl()} - http://${HOSTNAME}:${PORT}`);
  });
}

bootstrap();
