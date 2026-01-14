import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { LOCALE_RULES } from '../core/config/locale.module';
import type { ILocaleRules } from '../core/config/locale-rules.interface';

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);

    constructor(
        @Inject(LOCALE_RULES)
        private readonly localeRules: ILocaleRules,
    ) { }

    async triggerPayment(agentId: number, amount: number): Promise<any> {
        if (!this.localeRules.supportsMobileMoney()) {
            throw new BadRequestException('Mobile Money is not supported in this region.');
        }

        this.logger.log(`Processing Orange Money payment of ${amount} for agent ${agentId}...`);
        // Simulate API call
        return { status: 'SUCCESS', transactionId: `TXN-${Date.now()}`, amount, agentId, provider: 'Orange Money' };
    }
}
