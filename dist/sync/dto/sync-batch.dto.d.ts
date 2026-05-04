export declare class SyncActionDto {
    type: string;
    timestamp: number;
    payload: Record<string, unknown>;
}
export declare class SyncBatchDto {
    actions: SyncActionDto[];
}
