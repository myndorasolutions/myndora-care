import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  isSimulation,
  resolveEnvironment,
  resolveMockPaystack,
} from './config/environment';

function configuredCorsOrigins(): string[] {
  return (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/** Vercel preview and production hosts, including nested subdomains. */
function isVercelAppOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' && url.hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

function isCorsOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  if (isSimulation()) return true;
  if (isVercelAppOrigin(origin)) return true;
  const corsOrigins = configuredCorsOrigins();
  return corsOrigins.includes('*') || corsOrigins.includes(origin);
}

async function bootstrap() {
  const environment = resolveEnvironment();
  if (isSimulation()) {
    process.env.MOCK_PAYSTACK = 'true';
    process.env.MOCK_AT = process.env.MOCK_AT || 'true';
  }

  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (origin, callback) => {
      if (isCorsOriginAllowed(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = Number(process.env.PORT ?? process.env.APP_PORT ?? 8080);
  await app.listen(port, '0.0.0.0');
  console.log(
    `Myndora Care API listening on port ${port} (prefix /api/v1) ENVIRONMENT=${environment} MOCK_PAYSTACK=${resolveMockPaystack()}`,
  );
}

bootstrap();
