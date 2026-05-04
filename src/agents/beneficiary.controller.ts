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
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { BeneficiaryService } from './beneficiary.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Permissions } from '../auth/permissions.decorator';
import {
  CreateBeneficiaryDto,
  UpdateBeneficiaryDto,
} from './dto/beneficiary.dto';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { resolveTenantId } from '../auth/tenant-context';

@Controller('beneficiaries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BeneficiaryController {
  constructor(private readonly beneficiaryService: BeneficiaryService) {}

  @Get('agent/:agentId')
  @Permissions('agents:read')
  findAllByAgent(
    @Request() req: AuthenticatedRequest,
    @Param('agentId', ParseIntPipe) agentId: number,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.beneficiaryService.findAll(
      resolveTenantId(req, queryTenantId),
      agentId,
    );
  }

  @Post()
  @Permissions('agents:write')
  create(
    @Request() req: AuthenticatedRequest,
    @Body() data: CreateBeneficiaryDto,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.beneficiaryService.create(
      resolveTenantId(req, queryTenantId),
      data,
    );
  }

  @Patch(':id')
  @Permissions('agents:write')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateBeneficiaryDto,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.beneficiaryService.update(
      resolveTenantId(req, queryTenantId),
      id,
      data,
    );
  }

  @Delete(':id')
  @Permissions('agents:write')
  remove(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.beneficiaryService.remove(
      resolveTenantId(req, queryTenantId),
      id,
    );
  }
}
