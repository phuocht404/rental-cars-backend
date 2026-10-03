import { Test, TestingModule } from '@nestjs/testing';

import { CarFeaturesService } from './car-features.service';

describe('CarFeaturesService', () => {
  let service: CarFeaturesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CarFeaturesService],
    })
      // Tự tạo mock rỗng cho các dependency (PrismaService, CloudinaryService...)
      .useMocker(() => ({}))
      .compile();

    service = module.get<CarFeaturesService>(CarFeaturesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
