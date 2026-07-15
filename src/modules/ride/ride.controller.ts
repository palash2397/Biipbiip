import { Controller } from '@nestjs/common';
import { RideService } from './ride.service';

@Controller('ride')
export class RideController {
  constructor(private readonly rideService: RideService) {}
}
