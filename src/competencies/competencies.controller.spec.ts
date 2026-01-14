import { Test, TestingModule } from '@nestjs/testing';
import { CompetenciesController } from './competencies.controller';

describe('CompetenciesController', () => {
  let controller: CompetenciesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompetenciesController],
    }).compile();

    controller = module.get<CompetenciesController>(CompetenciesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
