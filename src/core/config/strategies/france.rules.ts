import { ILocaleRules } from '../locale-rules.interface';

export class FranceRules implements ILocaleRules {
    getWeeklyWorkLimit(): number {
        return 35;
    }

    getDailyRestHours(): number {
        return 11;
    }

    supportsMobileMoney(): boolean {
        return false;
    }

    requiresOfflineMode(): boolean {
        return false;
    }
}
