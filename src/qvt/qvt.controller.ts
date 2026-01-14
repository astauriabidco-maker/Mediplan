import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { QvtService, ShiftInput } from './qvt.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('qvt')
@UseGuards(JwtAuthGuard)
export class QvtController {
    constructor(private readonly qvtService: QvtService) { }

    @Post('analyze')
    analyze(@Body('shifts') shifts: ShiftInput[]) {
        return this.qvtService.calculateFatigueScore(shifts);
    }
}
