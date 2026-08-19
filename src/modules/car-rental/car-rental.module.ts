import { Module } from '@nestjs/common';
import { CarRentalService } from './car-rental.service';
import { CarRentalController } from './car-rental.controller';

import { MongooseModule } from '@nestjs/mongoose';
import {
  CompanyCar,
  CompanyCarSchema,
} from '../company/schema/company-car.schema';
import { Company, CompanySchema } from '../company/schema/company.schema';
import { User, UserSchema } from '../user/schema/user.schema';
import {
  CarRentalBooking,
  CarRentalBookingSchema,
} from './schema/car-rental-booking.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CompanyCar.name, schema: CompanyCarSchema },
      { name: Company.name, schema: CompanySchema },
      { name: User.name, schema: UserSchema },
      { name: CarRentalBooking.name, schema: CarRentalBookingSchema },
    ]),
  ],
  controllers: [CarRentalController],
  providers: [CarRentalService],
})
export class CarRentalModule {}
