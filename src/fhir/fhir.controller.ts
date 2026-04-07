import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { FhirService } from './fhir.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('fhir')
@UseGuards(JwtAuthGuard)
export class FhirController {
    constructor(private readonly fhirService: FhirService) { }

    @Get('Practitioner')
    @Permissions('agents:read')
    getPractitioners(@Request() req: any) {
        const tenantId = req.user.tenantId;
        return this.fhirService.getPractitioners(tenantId);
    }

    @Get('Slot')
    @Permissions('agents:read')
    getSlots(@Request() req: any) {
        const tenantId = req.user.tenantId;
        // Simplified query logic for date (defaulting to current month if not provided via query)
        const start = req.query.start ? new Date(req.query.start) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = req.query.end ? new Date(req.query.end) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
        return this.fhirService.getSlots(tenantId, start, end);
    }
}
