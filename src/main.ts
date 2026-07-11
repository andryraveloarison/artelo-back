import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: '*',
    credentials: true,
    exposedHeaders: ['Date'],
  });

  // Enable Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Setup Swagger OpenAPI Specification
  const config = new DocumentBuilder()
    .setTitle('Kanto - Cover Contest API')
    .setDescription('Backend REST API for Kanto cover contest platform. Includes ELO rating updates, cover uploads, and restrictive voting policies.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Setup Scalar API Reference at '/reference'
  app.use(
    '/reference',
    apiReference({
      theme: 'purple',
      spec: {
        content: document,
      },
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 NestJS application running on http://localhost:${port}`);
  console.log(`📄 Scalar API reference available at http://localhost:${port}/reference`);
}
bootstrap();
