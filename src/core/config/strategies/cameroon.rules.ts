import { ILocaleRules } from '../locale-rules.interface';

export class CameroonRules implements ILocaleRules {
    getWeeklyWorkLimit(): number {
        return 45; // Hospital equivalence
    }

    getDailyRestHours(): number {
        return 12;
    }

    supportsMobileMoney(): boolean {
        return true;
    }

    requiresOfflineMode(): boolean {
        return true;
    }
}
