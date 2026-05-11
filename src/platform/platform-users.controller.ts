import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformRoleGuard } from './platform-role.guard';
import { PlatformUsersService } from './platform-users.service';
import type {
  CreatePlatformUserDto,
  ResetPlatformUserPasswordDto,
} from './platform-users.service';

@Controller('platform/users')
@UseGuards(JwtAuthGuard, PlatformRoleGuard)
export class PlatformUsersController {
  constructor(private readonly platformUsersService: PlatformUsersService) {}

  @Get()
  listPlatformUsers() {
    return this.platformUsersService.listPlatformUsers();
  }

  @Post()
  createPlatformUser(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreatePlatformUserDto,
  ) {
    return this.platformUsersService.createPlatformUser(body, req.user);
  }

  @Post(':userId/disable')
  disablePlatformUser(
    @Req() req: AuthenticatedRequest,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.platformUsersService.disablePlatformUser(userId, req.user);
  }

  @Post(':userId/reactivate')
  reactivatePlatformUser(
    @Req() req: AuthenticatedRequest,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.platformUsersService.reactivatePlatformUser(userId, req.user);
  }

  @Post(':userId/password-reset')
  resetPlatformUserPassword(
    @Req() req: AuthenticatedRequest,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: ResetPlatformUserPasswordDto,
  ) {
    return this.platformUsersService.resetPlatformUserPassword(
      userId,
      body,
      req.user,
    );
  }
}
