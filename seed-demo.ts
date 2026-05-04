import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { SeedController } from './src/seed/seed.controller';

async function bootstrap() {
  console.log('Starting demo reset for tenant HGD-DOUALA...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const seedController = app.get(SeedController);
  const result = await seedController.seedHGD();

  console.log(JSON.stringify(result, null, 2));
  await app.close();
}

bootstrap().catch((error) => {
  console.error('Demo reset failed:', error);
  process.exit(1);
});
