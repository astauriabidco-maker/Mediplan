import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { FacilityService } from './facility.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Permissions } from '../auth/permissions.decorator';
import { Facility } from './entities/facility.entity';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { resolveTenantId } from '../auth/tenant-context';

@Controller('facilities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FacilityController {
  constructor(private readonly facilityService: FacilityService) {}

  @Get()
  @Permissions('services:read')
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.facilityService.findAll(resolveTenantId(req, queryTenantId));
  }

  @Post()
  @Permissions('services:write')
  create(
    @Request() req: AuthenticatedRequest,
    @Body() data: Partial<Facility>,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.facilityService.create(
      resolveTenantId(req, queryTenantId),
      data,
    );
  }

  @Patch(':id')
  @Permissions('services:write')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<Facility>,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.facilityService.update(
      resolveTenantId(req, queryTenantId),
      id,
      data,
    );
  }

  @Delete(':id')
  @Permissions('services:write')
  remove(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.facilityService.remove(resolveTenantId(req, queryTenantId), id);
  }
}
