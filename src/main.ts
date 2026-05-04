import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.use(json({ limit: process.env.JSON_BODY_LIMIT || '25mb' }));
  app.use(
    urlencoded({
      extended: true,
      limit: process.env.JSON_BODY_LIMIT || '25mb',
    }),
  );

  app.use(helmet());

  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Mediplan API')
    .setDescription('Gestion des agents, contrats et compétences')
    .setVersion('1.0')
    .addTag('agents')
    .addTag('competencies')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT || 3005);
}
void bootstrap();
