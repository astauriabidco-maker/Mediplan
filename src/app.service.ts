import { Inject, Injectable } from '@nestjs/common';
import { LOCALE_RULES } from './core/config/locale.module';
import type { ILocaleRules } from './core/config/locale-rules.interface';

@Injectable()
export class AppService {
  constructor(
    @Inject(LOCALE_RULES) private readonly localeRules: ILocaleRules,
  ) { }

  getHello(): string {
    const limit = this.localeRules.getWeeklyWorkLimit();
    const mm = this.localeRules.supportsMobileMoney();
    return `Hello World! Work Limit: ${limit}h, Mobile Money: ${mm}`;
  }

  getConfig() {
    return {
      configuration: {
        region: this.localeRules.getWeeklyWorkLimit() === 35 ? 'France (Standard)' : 'Cameroun (Adapté)',
        features: {
          mobileMoney: this.localeRules.supportsMobileMoney(),
          offlineMode: true,
        },
      },
    };
  }
}
