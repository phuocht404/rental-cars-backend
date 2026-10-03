import { Test, TestingModule } from '@nestjs/testing';

import { CarImagesService } from './car-images.service';

describe('CarImagesService', () => {
  let service: CarImagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CarImagesService],
    })
      // Tự tạo mock rỗng cho các dependency (PrismaService, CloudinaryService...)
      .useMocker(() => ({}))
      .compile();

    service = module.get<CarImagesService>(CarImagesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
