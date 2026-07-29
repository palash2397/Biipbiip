import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Controller, UseGuards } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';

import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';

import { RoleGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { UserRole } from 'src/common/enums/user/role.enum';

@ApiTags('Super Admin')
@Controller('super-admin')
@UseGuards(JwtAuthGuard)
@UseGuards(RoleGuard)
@Roles(UserRole.SUPERADMIN)
@ApiBearerAuth()
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}
}
