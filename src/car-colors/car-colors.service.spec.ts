import { Test, TestingModule } from '@nestjs/testing';

import { CarColorsService } from './car-colors.service';

describe('CarColorsService', () => {
  let service: CarColorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CarColorsService],
    })
      // Tự tạo mock rỗng cho các dependency (PrismaService, CloudinaryService...)
      .useMocker(() => ({}))
      .compile();

    service = module.get<CarColorsService>(CarColorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
