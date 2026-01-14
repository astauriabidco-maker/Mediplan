import type { ILocaleRules } from '../core/config/locale-rules.interface';
export declare class PaymentService {
    private readonly localeRules;
    private readonly logger;
    constructor(localeRules: ILocaleRules);
    triggerPayment(agentId: number, amount: number): Promise<any>;
}
