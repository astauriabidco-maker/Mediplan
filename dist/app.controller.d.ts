import { DataSource } from 'typeorm';
import { AppService } from './app.service';
import { SeedService } from './seed.service';
export declare class AppController {
    private readonly appService;
    private readonly seedService;
    private readonly dataSource;
    constructor(appService: AppService, seedService: SeedService, dataSource: DataSource);
    getLiveness(): {
        status: string;
        service: string;
        checkedAt: string;
        uptimeSeconds: number;
    };
    getReadiness(): Promise<{
        status: string;
        service: string;
        checkedAt: string;
        dependencies: {
            database: string;
        };
    }>;
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
