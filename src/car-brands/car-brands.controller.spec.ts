import { Test, TestingModule } from '@nestjs/testing';

import { CarBrandsController } from './car-brands.controller';
import { CarBrandsService } from './car-brands.service';

describe('CarBrandsController', () => {
  let controller: CarBrandsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CarBrandsController],
      providers: [CarBrandsService],
    })
      // Tự tạo mock rỗng cho các dependency (PrismaService, CloudinaryService...)
      .useMocker(() => ({}))
      .compile();

    controller = module.get<CarBrandsController>(CarBrandsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
