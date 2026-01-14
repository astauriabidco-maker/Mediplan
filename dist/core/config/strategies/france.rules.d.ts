import { ILocaleRules } from '../locale-rules.interface';
export declare class FranceRules implements ILocaleRules {
    getWeeklyWorkLimit(): number;
    getDailyRestHours(): number;
    supportsMobileMoney(): boolean;
    requiresOfflineMode(): boolean;
}
