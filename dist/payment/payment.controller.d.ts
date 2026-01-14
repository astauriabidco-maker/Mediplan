import { PaymentService } from './payment.service';
export declare class PaymentController {
    private readonly paymentService;
    constructor(paymentService: PaymentService);
    trigger(body: {
        agentId: number;
        amount: number;
    }): Promise<any>;
}
