import { Test, TestingModule } from '@nestjs/testing';

import { FeaturesController } from './features.controller';
import { FeaturesService } from './features.service';

describe('FeaturesController', () => {
  let controller: FeaturesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeaturesController],
      providers: [FeaturesService],
    })
      // Tự tạo mock rỗng cho các dependency (PrismaService, CloudinaryService...)
      .useMocker(() => ({}))
      .compile();

    controller = module.get<FeaturesController>(FeaturesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
