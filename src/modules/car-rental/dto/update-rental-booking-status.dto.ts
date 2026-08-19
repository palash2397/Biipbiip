import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { CarRentalBookingStatus } from 'src/common/enums/company/car-rental-booking-status.enum';

export class UpdateRentalBookingStatusDto {
  @ApiProperty({
    enum: [CarRentalBookingStatus.ACCEPTED, CarRentalBookingStatus.REJECTED],
    example: CarRentalBookingStatus.ACCEPTED,
  })
  @IsEnum(CarRentalBookingStatus)
  @IsNotEmpty()
  status: CarRentalBookingStatus;

  @ApiProperty({
    example: 'Car is not available.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}
