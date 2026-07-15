import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';

import { ApiResponse } from 'src/helpers/ApiResponse';
import { Msg } from 'src/helpers/responseMsg';

import { BookRideDto } from './dto/book-ride.dto';

import { RideStatus } from 'src/common/enums/ride/ride-enum';
import { VerificationStatus } from 'src/common/enums/driver/verification-status.enum';

import { Ride, RideDocument } from './schema/ride.schema';

import {
  RideType,
  RideTypeDocument,
} from '../ride-type/schema/ride-type.schema';

import { Driver, DriverDocument } from '../driver/schema/driver.schema';

import { SocketService } from '../socket/socket.service';

@Injectable()
export class RideService {
  constructor(
    @InjectModel(Ride.name)
    private readonly rideModel: Model<RideDocument>,

    @InjectModel(RideType.name)
    private readonly rideTypeModel: Model<RideTypeDocument>,

    @InjectModel(Driver.name)
    private readonly driverModel: Model<DriverDocument>,

    private readonly socketService: SocketService,
  ) {}

  async bookRide(userId: string, dto: BookRideDto) {
    try {
      const rideType = await this.rideTypeModel.findById(dto.rideType);

      if (!rideType) {
        return new ApiResponse(404, {}, Msg.RIDE_TYPE_NOT_FOUND);
      }

      const activeRide = await this.rideModel.findOne({
        user: userId,
        status: {
          $in: [
            RideStatus.SEARCHING_DRIVER,
            RideStatus.DRIVER_FOUND,
            RideStatus.DRIVER_ARRIVING,
            RideStatus.ONGOING,
          ],
        },
      });

      if (activeRide) {
        return new ApiResponse(400, {}, Msg.ACTIVE_RIDE_EXISTS);
      }

      const response = await axios.post(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
        {
          origin: {
            location: {
              latLng: {
                latitude: dto.pickupLatitude,
                longitude: dto.pickupLongitude,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: dto.destinationLatitude,
                longitude: dto.destinationLongitude,
              },
            },
          },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
            'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
          },
        },
      );

      const route = response.data.routes?.[0];

      if (!route) {
        return new ApiResponse(400, {}, Msg.ROUTE_NOT_FOUND);
      }

      const distance = route.distanceMeters / 1000;

      const estimatedTime = Math.ceil(
        Number(route.duration.replace('s', '')) / 60,
      );

      const fare =
        rideType.baseFare +
        distance * rideType.perKmCharge +
        estimatedTime * rideType.perMinuteCharge;

      const estimatedFare = Math.max(fare, rideType.minimumFare);

      const ride = await this.rideModel.create({
        user: userId,
        rideType: dto.rideType,

        pickupAddress: dto.pickupAddress,
        pickupLatitude: dto.pickupLatitude,
        pickupLongitude: dto.pickupLongitude,

        destinationAddress: dto.destinationAddress,
        destinationLatitude: dto.destinationLatitude,
        destinationLongitude: dto.destinationLongitude,

        distance: Number(distance.toFixed(2)),
        estimatedTime,
        estimatedFare: Number(estimatedFare.toFixed(2)),

        status: RideStatus.SEARCHING_DRIVER,
      });

      const nearbyDrivers = await this.driverModel
        .find({
          isOnline: true,
          verificationStatus: VerificationStatus.APPROVED,

          currentLocation: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [dto.pickupLongitude, dto.pickupLatitude],
              },
              $maxDistance: 5000,
            },
          },
        })
        .populate('user')
        .lean();

      for (const driver of nearbyDrivers) {
        const driverUser: any = driver.user;

        if (!driverUser?._id) {
          continue;
        }

        this.socketService.emitToUser(
          driverUser._id.toString(),
          'newRideRequest',
          {
            rideId: ride._id,

            pickupAddress: ride.pickupAddress,
            pickupLatitude: ride.pickupLatitude,
            pickupLongitude: ride.pickupLongitude,

            destinationAddress: ride.destinationAddress,
            destinationLatitude: ride.destinationLatitude,
            destinationLongitude: ride.destinationLongitude,

            distance: ride.distance,
            estimatedTime: ride.estimatedTime,
            estimatedFare: ride.estimatedFare,

            rideType: {
              _id: rideType._id,
              title: rideType.title,
            },
          },
        );
      }

      return new ApiResponse(
        201,
        {
          ride,
          nearbyDriversCount: nearbyDrivers.length,
        },
        Msg.RIDE_BOOKED,
      );
    } catch (error) {
      console.log('error while booking ride', error);

      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }
}
