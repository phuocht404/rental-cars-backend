import { Test, TestingModule } from '@nestjs/testing';

import { OrderDetailService } from './order-detail.service';

describe('OrderDetailService', () => {
  let service: OrderDetailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderDetailService],
    })
      // Tự tạo mock rỗng cho các dependency (PrismaService, CloudinaryService...)
      .useMocker(() => ({}))
      .compile();

    service = module.get<OrderDetailService>(OrderDetailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
