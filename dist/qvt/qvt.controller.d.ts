import { QvtService, ShiftInput } from './qvt.service';
export declare class QvtController {
    private readonly qvtService;
    constructor(qvtService: QvtService);
    analyze(shifts: ShiftInput[]): import("./qvt.service").QvtAnalysis;
}
