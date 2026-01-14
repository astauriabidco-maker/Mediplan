import { Test, TestingModule } from '@nestjs/testing';
import { CompetenciesService } from './competencies.service';

describe('CompetenciesService', () => {
  let service: CompetenciesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CompetenciesService],
    }).compile();

    service = module.get<CompetenciesService>(CompetenciesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
