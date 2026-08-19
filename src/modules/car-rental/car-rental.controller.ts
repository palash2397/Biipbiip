import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { CarRentalService } from './car-rental.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateCarRentalBookingDto } from './dto/create-rental-booking.dto';

@ApiBearerAuth()
@ApiTags('car-rental')
@Controller('car-rental')
export class CarRentalController {
  constructor(private readonly carRentalService: CarRentalService) {}

  @Post('book')
  async createBooking(@Req() req: any, @Body() dto: CreateCarRentalBookingDto) {
    return this.carRentalService.createBooking(req.user.userId, dto);
  }
}
