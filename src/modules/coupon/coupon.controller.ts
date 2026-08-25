import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CouponService } from './coupon.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { RoleGuard } from '../auth/roles/roles.guard';
import { CouponStatus } from 'src/common/enums/coupon/coupon-status.enum';

import { Roles } from '../auth/roles/roles.decorator';
import { UserRole } from 'src/common/enums/user/role.enum';

@ApiTags('Coupon')
@Controller('/coupon')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post('/create')
  @ApiBearerAuth('access-token')
  @Roles(UserRole.SUPERADMIN)
  @UseGuards(JwtAuthGuard, RoleGuard)
  createCoupon(@Body() dto: CreateCouponDto) {
    return this.couponService.createCoupon(dto);
  }

  @Get('/all')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RoleGuard)
  getAllCoupons() {
    return this.couponService.getAllCoupons();
  }

  @Get('stats')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.SUPERADMIN)
  getCouponStats() {
    return this.couponService.getCouponStats();
  }

  @Patch(':id/status')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.SUPERADMIN)
  toggleStatus(@Param('id') id: string) {
    return this.couponService.toggleStatus(id);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.SUPERADMIN)
  deleteCoupon(@Param('id') id: string) {
    return this.couponService.deleteCoupon(id);
  }

  @Post('apply')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  applyCoupon(@Body() dto: ApplyCouponDto) {
    return this.couponService.applyCoupon(dto);
  }
}
