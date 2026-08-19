import { Test, TestingModule } from '@nestjs/testing';
import { CarRentalController } from './car-rental.controller';
import { CarRentalService } from './car-rental.service';

describe('CarRentalController', () => {
  let controller: CarRentalController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CarRentalController],
      providers: [CarRentalService],
    }).compile();

    controller = module.get<CarRentalController>(CarRentalController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
