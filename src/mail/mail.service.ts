import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendMail(options: {
    to: string;
    from: string;
    subject: string;
    template: string;
    context: Record<string, any>;
  }): Promise<void> {
    try {
      const { to, subject, template, context, from } = options;

      await this.mailerService.sendMail({
        to,
        from,
        subject,
        template: 'order_confirmation',
        context,
      });
    } catch (error) {
      throw error;
    }
  }
}
