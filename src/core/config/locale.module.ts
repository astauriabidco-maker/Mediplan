import { Module, Global, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ILocaleRules } from './locale-rules.interface';
import { FranceRules } from './strategies/france.rules';
import { CameroonRules } from './strategies/cameroon.rules';

export const LOCALE_RULES = 'LOCALE_RULES';

const localeRulesProvider: Provider = {
    provide: LOCALE_RULES,
    useFactory: (configService: ConfigService): ILocaleRules => {
        const countryCode = configService.get<string>('COUNTRY_CODE');
        if (countryCode === 'CM') {
            return new CameroonRules();
        }
        return new FranceRules();
    },
    inject: [ConfigService],
};

@Global()
@Module({
    providers: [localeRulesProvider],
    exports: [localeRulesProvider],
})
export class LocaleConfigModule { }
