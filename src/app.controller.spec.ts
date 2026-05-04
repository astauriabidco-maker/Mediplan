import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LOCALE_RULES } from './core/config/locale.module';
import { SeedService } from './seed.service';

describe('AppController', () => {
  let appController: AppController;
  const dataSource = {
    query: jest.fn(async () => [{ '?column?': 1 }]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: SeedService, useValue: { seed: jest.fn() } },
        {
          provide: LOCALE_RULES,
          useValue: {
            getWeeklyWorkLimit: () => 35,
            supportsMobileMoney: () => false,
          },
        },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('returns process liveness without dependency checks', () => {
      expect(appController.getLiveness()).toEqual(
        expect.objectContaining({
          status: 'UP',
          service: 'mediplan-api',
          checkedAt: expect.any(String),
          uptimeSeconds: expect.any(Number),
        }),
      );
    });

    it('checks database readiness', async () => {
      await expect(appController.getReadiness()).resolves.toEqual(
        expect.objectContaining({
          status: 'UP',
          dependencies: { database: 'UP' },
        }),
      );
      expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
    });
  });
});
