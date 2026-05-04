import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TriggerPaymentDto } from './dto/payment.dto';

@Controller('payment')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('trigger')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  trigger(@Body() body: TriggerPaymentDto) {
    return this.paymentService.triggerPayment(body.agentId, body.amount);
  }
}
