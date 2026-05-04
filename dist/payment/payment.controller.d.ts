import { PaymentService } from './payment.service';
import { TriggerPaymentDto } from './dto/payment.dto';
export declare class PaymentController {
    private readonly paymentService;
    constructor(paymentService: PaymentService);
    trigger(body: TriggerPaymentDto): Promise<any>;
}
