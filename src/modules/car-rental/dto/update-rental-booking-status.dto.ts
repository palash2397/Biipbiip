import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { CarRentalBookingStatus } from 'src/common/enums/company/car-rental-booking-status.enum';

export class UpdateRentalBookingStatusDto {
  @ApiProperty({
    example: '66a123456789abcdef123456',
  })
  @IsMongoId()
  @IsNotEmpty()
  bookingId: string;

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
