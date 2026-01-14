export interface ILocaleRules {
    getWeeklyWorkLimit(): number;
    getDailyRestHours(): number;
    supportsMobileMoney(): boolean;
    requiresOfflineMode(): boolean;
}
