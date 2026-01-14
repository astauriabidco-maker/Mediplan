export declare class SyncActionDto {
    type: string;
    timestamp: number;
    payload: any;
}
export declare class SyncBatchDto {
    actions: SyncActionDto[];
}
