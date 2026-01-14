import { AppService } from './app.service';
import { SeedService } from './seed.service';
export declare class AppController {
    private readonly appService;
    private readonly seedService;
    constructor(appService: AppService, seedService: SeedService);
    seed(): Promise<{
        message: string;
        agents: number;
        shifts: number;
    }>;
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
