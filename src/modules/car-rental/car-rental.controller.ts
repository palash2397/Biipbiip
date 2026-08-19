import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CarRentalService } from './car-rental.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateCarRentalBookingDto } from './dto/create-rental-booking.dto';

import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { RoleGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { UserRole } from 'src/common/enums/user/role.enum';

@ApiBearerAuth('access-token')
@ApiTags('car-rental')
@Controller('car-rental')
@UseGuards(JwtAuthGuard, RoleGuard)
export class CarRentalController {
  constructor(private readonly carRentalService: CarRentalService) {}

  @Post('book')
  @Roles(UserRole.USER, UserRole.SUPERADMIN)
  async createBooking(@Req() req: any, @Body() dto: CreateCarRentalBookingDto) {
    return this.carRentalService.createBooking(req.user.id, dto);
  }

  @Get('bookings')
  @Roles(UserRole.USER, UserRole.SUPERADMIN)
  async getMyBookings(@Req() req: any) {
    return this.carRentalService.myBookings(req.user.id);
  }

  @Get('company/bookings')
  @Roles(UserRole.USER, UserRole.SUPERADMIN)
  async getCompanyBookings(@Req() req: any) {
    return this.carRentalService.companyBookings(req.user.id);
  }
}
