import type { ILocaleRules } from './core/config/locale-rules.interface';
export declare class AppService {
    private readonly localeRules;
    constructor(localeRules: ILocaleRules);
    getHello(): string;
    getConfig(): {
        configuration: {
            region: string;
            features: {
                mobileMoney: boolean;
                offlineMode: boolean;
            };
        };
    };
}
