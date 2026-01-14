import { ILocaleRules } from '../locale-rules.interface';
export declare class CameroonRules implements ILocaleRules {
    getWeeklyWorkLimit(): number;
    getDailyRestHours(): number;
    supportsMobileMoney(): boolean;
    requiresOfflineMode(): boolean;
}
