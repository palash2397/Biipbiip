import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateCarRentalBookingDto {
  @ApiProperty({
    example: '66a123456789abcdef123456',
  })
  @IsMongoId()
  @IsNotEmpty()
  carId: string;

  @ApiProperty({
    example: '2026-08-25',
  })
  @IsNotEmpty()
  pickupDate: string;

  @ApiProperty({
    example: '2026-08-28',
  })
  @IsNotEmpty()
  returnDate: string;
}
