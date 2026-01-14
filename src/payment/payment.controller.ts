import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payment')
@UseGuards(JwtAuthGuard)
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) { }

    @Post('trigger')
    trigger(@Body() body: { agentId: number; amount: number }) {
        return this.paymentService.triggerPayment(body.agentId, body.amount);
    }
}
