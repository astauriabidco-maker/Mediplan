import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { resolveTenantId } from '../auth/tenant-context';
import {
  ProductionSignoffParamDto,
  UpsertProductionSignoffDto,
} from './dto/production-readiness.dto';
import { ProductionReadinessService } from './production-readiness.service';

@Controller('production-readiness')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductionReadinessController {
  constructor(
    private readonly productionReadinessService: ProductionReadinessService,
  ) {}

  @Get('signoffs')
  @Permissions('release:read', 'audit:read')
  findSignoffs(
    @Request() req: AuthenticatedRequest,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.productionReadinessService.findSignoffs(
      resolveTenantId(req, queryTenantId),
    );
  }

  @Patch('signoffs/:key')
  @Permissions('release:write')
  upsertSignoff(
    @Request() req: AuthenticatedRequest,
    @Param() params: ProductionSignoffParamDto,
    @Body() dto: UpsertProductionSignoffDto,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.productionReadinessService.upsertSignoff(
      resolveTenantId(req, queryTenantId),
      params.key,
      dto,
      req.user.id,
    );
  }

  @Get('decision')
  @Permissions('release:read', 'audit:read')
  getDecision(
    @Request() req: AuthenticatedRequest,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.productionReadinessService.getDecision(
      resolveTenantId(req, queryTenantId),
    );
  }
}
