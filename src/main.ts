import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/http-exception.filter';
import * as dotenv from 'dotenv';
import { json, urlencoded } from 'express';

// Load environment variables
dotenv.config();

async function bootstrap() {
  // Disable default bodyParser to allow dynamic limit middleware
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  
  // Apply dynamic body parsing limits to secure unrelated endpoints
  app.use((req: any, res: any, next: any) => {
    const limit = req.path.includes('/products') ? '20mb' : '100kb';
    json({ limit })(req, res, next);
  });
  app.use((req: any, res: any, next: any) => {
    const limit = req.path.includes('/products') ? '20mb' : '100kb';
    urlencoded({ limit, extended: true })(req, res, next);
  });

  // Enable CORS for frontend connection
  app.enableCors({
    origin: '*', // Allow all origins for dev simplicity
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Enable global validations
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Apply unified error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Backend server running on http://localhost:${port}`);
}
bootstrap();
