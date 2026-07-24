import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { RatingService } from './rating.service';

import { ApiBearerAuth, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';

import { RoleGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { UserRole } from 'src/common/enums/user/role.enum';

import { CreateRatingDto } from './dto/create-rating.dto';

@ApiTags('Rating')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('rating')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Post('/submit')
  @Roles(UserRole.USER, UserRole.DRIVER, UserRole.PASSENGER)
  @UseGuards(RoleGuard)
  submitRating(@Req() req: any, @Body() dto: CreateRatingDto) {
    return this.ratingService.createRating(req.user.id, dto);
  }
}
