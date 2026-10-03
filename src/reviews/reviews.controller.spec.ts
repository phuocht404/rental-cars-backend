import { Test, TestingModule } from '@nestjs/testing';

import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

describe('ReviewsController', () => {
  let controller: ReviewsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [ReviewsService],
    })
      // Tự tạo mock rỗng cho các dependency (PrismaService, CloudinaryService...)
      .useMocker(() => ({}))
      .compile();

    controller = module.get<ReviewsController>(ReviewsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
