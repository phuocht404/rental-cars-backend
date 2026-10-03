import { Test, TestingModule } from '@nestjs/testing';

import { CarModelsController } from './car-models.controller';
import { CarModelsService } from './car-models.service';

describe('CarModelsController', () => {
  let controller: CarModelsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CarModelsController],
      providers: [CarModelsService],
    })
      // Tự tạo mock rỗng cho các dependency (PrismaService, CloudinaryService...)
      .useMocker(() => ({}))
      .compile();

    controller = module.get<CarModelsController>(CarModelsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
