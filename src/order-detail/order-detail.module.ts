import { Module } from '@nestjs/common';

import { OrderDetailController } from './order-detail.controller';
import { OrderDetailService } from './order-detail.service';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [MailModule],
  exports: [OrderDetailService],
  controllers: [OrderDetailController],
  providers: [OrderDetailService],
})
export class OrderDetailModule {}
