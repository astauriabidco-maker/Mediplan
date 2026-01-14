import { Test, TestingModule } from '@nestjs/testing';
import { QvtController } from './qvt.controller';

describe('QvtController', () => {
  let controller: QvtController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QvtController],
    }).compile();

    controller = module.get<QvtController>(QvtController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
