import { Controller } from '@nestjs/common';
import { CarRentalService } from './car-rental.service';

@Controller('car-rental')
export class CarRentalController {
  constructor(private readonly carRentalService: CarRentalService) {}
}
