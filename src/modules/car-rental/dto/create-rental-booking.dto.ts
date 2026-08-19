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
    example: '25-08-2026',
  })
  @IsDateString()
  @IsNotEmpty()
  pickupDate: string;

  @ApiProperty({
    example: '28-08-2026',
  })
  @IsDateString()
  @IsNotEmpty()
  returnDate: string;
}
