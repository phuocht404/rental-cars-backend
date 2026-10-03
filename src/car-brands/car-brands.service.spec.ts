import { Test, TestingModule } from '@nestjs/testing';

import { CarBrandsService } from './car-brands.service';

describe('CarBrandsService', () => {
  let service: CarBrandsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CarBrandsService],
    })
      // Tự tạo mock rỗng cho các dependency (PrismaService, CloudinaryService...)
      .useMocker(() => ({}))
      .compile();

    service = module.get<CarBrandsService>(CarBrandsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
