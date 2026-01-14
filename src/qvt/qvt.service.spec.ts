import { Test, TestingModule } from '@nestjs/testing';
import { QvtService } from './qvt.service';

describe('QvtService', () => {
  let service: QvtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QvtService],
    }).compile();

    service = module.get<QvtService>(QvtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
