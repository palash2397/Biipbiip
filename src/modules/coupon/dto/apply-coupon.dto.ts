import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyCouponDto {
  @ApiProperty({ example: 'WELCOME100' })
  @IsString()
  @IsNotEmpty()
  couponCode: string;
}
