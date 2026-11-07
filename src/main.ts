import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import { json, urlencoded } from 'express';
import helmet from 'helmet';

// Load environment variables
dotenv.config();

async function bootstrap() {
  // Disable default bodyParser to allow dynamic limit middleware
  // rawBody: true captures the raw request body for webhook signature verification (Razorpay)
  const app = await NestFactory.create(AppModule, { bodyParser: false, rawBody: true });
  
  // Apply dynamic body parsing limits to secure unrelated endpoints
  // /products, /banners and /categories accept base64 image payloads
  const isImageEndpoint = (path: string) =>
    path.includes('/products') || path.includes('/banners') || path.includes('/categories');
  app.use((req: any, res: any, next: any) => {
    const limit = isImageEndpoint(req.path) ? '20mb' : '100kb';
    json({ limit })(req, res, next);
  });
  app.use((req: any, res: any, next: any) => {
    const limit = isImageEndpoint(req.path) ? '20mb' : '100kb';
    urlencoded({ limit, extended: true })(req, res, next);
  });

  // Security headers
  app.use(helmet());

  // Enable CORS for frontend connection (supports multiple origins, comma-separated)
  const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:4200')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins,
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

  // Swagger API documentation (all non-production environments)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('SwaggedUp API')
      .setDescription('SwaggedUp menswear e-commerce API')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
        'JWT-auth',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    console.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
  }

  await app.listen(port, '0.0.0.0');
  console.log(`Backend server running on port ${port} [NODE_ENV=${process.env.NODE_ENV || 'development'}]`);
}
bootstrap();
