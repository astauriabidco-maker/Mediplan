import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
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
  BackupService,
  TenantBackupSnapshot,
  TenantImportMode,
} from './backup.service';

@Controller('tenant-backups')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('export')
  @Permissions('backup:read')
  async exportTenant(
    @Request() req: AuthenticatedRequest,
    @Query('tenantId') queryTenantId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.backupService.exportTenant(
      resolveTenantId(req, queryTenantId),
      {
        from: this.toOptionalDate(from, 'from'),
        to: this.toOptionalDate(to, 'to'),
      },
    );
  }

  @Post('import')
  @Permissions('backup:write')
  async importTenant(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: {
      snapshot: TenantBackupSnapshot;
      mode?: TenantImportMode;
    },
    @Query('tenantId') queryTenantId?: string,
  ) {
    return this.backupService.importTenant(
      resolveTenantId(req, queryTenantId),
      body.snapshot,
      req.user,
      body.mode ?? TenantImportMode.MERGE,
    );
  }

  private toOptionalDate(value: string | undefined, field: string) {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid ${field} date`);
    }
    return date;
  }
}
