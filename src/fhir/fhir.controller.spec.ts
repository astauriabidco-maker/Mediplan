import { Test, TestingModule } from '@nestjs/testing';
import { FhirController } from './fhir.controller';

describe('FhirController', () => {
  let controller: FhirController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FhirController],
    }).compile();

    controller = module.get<FhirController>(FhirController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
