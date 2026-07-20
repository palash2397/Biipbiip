import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';

import { ApiResponse } from 'src/helpers/ApiResponse';
import { Msg } from 'src/helpers/responseMsg';
import { UserRole } from 'src/common/enums/user/role.enum';

import { BookRideDto } from './dto/book-ride.dto';

import { RideStatus } from 'src/common/enums/ride/ride-enum';
import { VerificationStatus } from 'src/common/enums/driver/verification-status.enum';
import { Ride, RideDocument } from './schema/ride.schema';

import { AcceptRideDto } from './dto/accept-ride.dto';
import { RejectRideDto } from './dto/reject-ride.dto';
import { CancelRideDto } from './dto/cancel-ride.dto';

import {
  RideType,
  RideTypeDocument,
} from '../ride-type/schema/ride-type.schema';

import { Driver, DriverDocument } from '../driver/schema/driver.schema';
import { User, UserDocument } from '../user/schema/user.schema';

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

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

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
            RideStatus.DRIVER_ARRIVIED,
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

        pickupLocation: {
          type: 'Point',
          coordinates: [dto.pickupLongitude, dto.pickupLatitude],
        },

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
          // verificationStatus: VerificationStatus.APPROVED,

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

      console.log('nearby drivers count ---------->', nearbyDrivers.length);

      console.log(
        'nearby drivers ---------->',
        JSON.stringify(nearbyDrivers, null, 2),
      );

      // const nearbyDrivers = await this.driverModel
      //   .find({
      //     isOnline: true,
      //     verificationStatus: VerificationStatus.APPROVED,
      //   })
      //   .populate('user')
      //   .lean();

      // console.log('nearby drivers ---------->', nearbyDrivers);

      for (const driver of nearbyDrivers) {
        const driverUser: any = driver.user;

        // console.log(
        //   'sending ride to driver user ---------->',
        //   driverUser?._id?.toString(),
        // );

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

  async acceptRide(userId: string, dto: AcceptRideDto) {
    try {
      const driver = await this.driverModel.findOne({
        user: userId,
        isOnline: true,
        // verificationStatus: VerificationStatus.APPROVED,
      });

      if (!driver) {
        return new ApiResponse(404, {}, Msg.DRIVER_NOT_AVAILABLE);
      }

      const ride = await this.rideModel.findOneAndUpdate(
        {
          _id: dto.rideId,
          driver: null,
          status: RideStatus.SEARCHING_DRIVER,
        },
        {
          driver: driver._id,
          status: RideStatus.DRIVER_FOUND,
        },
        {
          new: true,
        },
      );

      if (!ride) {
        return new ApiResponse(404, {}, Msg.RIDE_ALREADY_ACCEPTED);
      }

      const rideData = await this.rideModel
        .findById(ride._id)
        .populate('driver')
        .populate('rideType')
        .lean();

      this.socketService.emitToUser(
        ride.user.toString(),
        'driverFound',
        rideData,
      );

      return new ApiResponse(
        201,
        {
          ride,
          driver,
          rideData,
        },
        Msg.RIDE_ACCEPTED,
      );
    } catch (error) {
      console.log('error while accepting ride', error);

      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async rejectRide(userId: string, dto: RejectRideDto) {
    try {
    } catch (error) {}
  }

  async cancelRide(userId: string, dto: CancelRideDto) {
    try {
      const ride = await this.rideModel
        .findById(dto.rideId)
        .populate('user')
        .populate('driver');

      if (!ride) {
        return new ApiResponse(404, {}, Msg.RIDE_NOT_FOUND);
      }

      if (ride.status === RideStatus.COMPLETED) {
        return new ApiResponse(400, {}, Msg.RIDE_ALREADY_COMPLETED);
      }

      if (ride.status === RideStatus.CANCELLED) {
        return new ApiResponse(400, {}, Msg.RIDE_ALREADY_CANCELLED);
      }

      const driver = await this.driverModel.findOne({
        user: userId,
      });

      /**
       * USER CANCELLED
       */

      console.log('USER CANCELLED', ride.user._id.toString(), userId);
      if (ride.user._id.toString() === userId) {
        ride.status = RideStatus.CANCELLED;
        ride.cancelledBy = UserRole.USER;
        ride.cancelReason = dto.reason || '';

        await ride.save();

        if (ride.driver) {
          this.socketService.emitToUser(
            (ride.driver as any).user.toString(),
            'passengerCancelledRide',
            ride,
          );

          console.log('Ride Driver:', ride.driver);
        } else {
          const nearbyDrivers = await this.driverModel
            .find({
              isOnline: true,
              // verificationStatus: VerificationStatus.APPROVED,
              currentLocation: {
                $near: {
                  $geometry: {
                    type: 'Point',
                    coordinates: [ride.pickupLongitude, ride.pickupLatitude],
                  },
                  $maxDistance: 5000,
                },
              },
            })
            .populate('user');

          for (const nearbyDriver of nearbyDrivers) {
            if ((nearbyDriver as any).user?._id) {
              this.socketService.emitToUser(
                (nearbyDriver as any).user._id.toString(),
                'rideCancelled',
                ride,
              );
            }
          }
        }

        return new ApiResponse(200, ride, Msg.RIDE_CANCELLED);
      }

      /**
       * DRIVER CANCELLED
       */
      if (
        driver &&
        ride.driver &&
        (ride.driver as any)._id.toString() === driver._id.toString()
      ) {
        ride.driver = null as any;

        ride.status = RideStatus.SEARCHING_DRIVER;

        ride.rejectedDrivers.push(driver._id);

        await ride.save();

        this.socketService.emitToUser(
          ride.user._id.toString(),
          'searchingNewDriver',
          ride,
        );

        /**
         * search another driver
         */

        const nearbyDrivers = await this.driverModel
          .find({
            _id: {
              $nin: ride.rejectedDrivers,
            },

            isOnline: true,

            verificationStatus: VerificationStatus.APPROVED,

            currentLocation: {
              $near: {
                $geometry: {
                  type: 'Point',

                  coordinates: [ride.pickupLongitude, ride.pickupLatitude],
                },

                $maxDistance: 5000,
              },
            },
          })
          .populate('user');

        for (const nearbyDriver of nearbyDrivers) {
          this.socketService.emitToUser(
            nearbyDriver.user._id.toString(),

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

              rideType: ride.rideType,
            },
          );
        }

        return new ApiResponse(200, ride, Msg.RIDE_CANCELLED);
      }

      return new ApiResponse(403, {}, Msg.UNAUTHORIZED);
    } catch (error) {
      console.log(error);

      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async driverActiveRide(userId: string) {
    try {
      const driver = await this.driverModel.findOne({
        user: userId,
      });
      if (!driver) {
        return new ApiResponse(404, {}, Msg.DRIVER_NOT_FOUND);
      }

      const ride = await this.rideModel
        .findOne({
          driver: driver._id,
          status: {
            $in: [
              RideStatus.DRIVER_FOUND,
              RideStatus.DRIVER_ARRIVIED,
              RideStatus.ONGOING,
            ],
          },
        })
        .populate('user')
        .populate('rideType');

      if (!ride) {
        return new ApiResponse(200, null, Msg.NO_ACTIVE_RIDES_FOUND);
      }

      return new ApiResponse(200, ride, Msg.RIDES_FETCHED);
    } catch (error) {
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async userActiveRide(userId: string) {
    try {
      const user = await this.userModel.findOne({
        _id: userId,
      });

      // console.log(`user -------->`, user);
      if (!user) {
        return new ApiResponse(404, {}, Msg.USER_NOT_FOUND);
      }

      const ride = await this.rideModel
        .findOne({
          user: user._id,
          status: {
            $in: [
              RideStatus.SEARCHING_DRIVER,
              RideStatus.DRIVER_FOUND,
              RideStatus.DRIVER_ARRIVIED,
              RideStatus.ONGOING,
            ],
          },
        })
        .populate('user')
        .populate({
          path: 'driver',
          populate: {
            path: 'user',
            select: 'firstName lastName email avatar phoneNumber countryCode',
          },
        })
        .populate('rideType')
        .lean();

      console.log('user active ride', ride);

      if (!ride) {
        return new ApiResponse(200, null, Msg.NO_ACTIVE_RIDES_FOUND);
      }

      const baseUrl = process.env.BASE_URL;

      if (ride.user) {
        const u = ride.user as any;
        if (u.avatar) {
          u.avatar = `${baseUrl}/api/v1/uploads/profile/${u.avatar}`;
        } else {
          u.avatar = process.env.DEFAULT_IMAGE;
        }
      }

      if (ride.driver) {
        const d = ride.driver as any;

        if (d.user) {
          d.user.avatar = `${baseUrl}/api/v1/uploads/profile/${d.user.avatar}`;
        } else {
          d.user.avatar = process.env.DEFAULT_IMAGE;
        }

        const formatUrl = (fileName?: string) =>
          fileName && !fileName.startsWith('http')
            ? `${baseUrl}/api/v1/uploads/driver/${fileName}`
            : fileName;

        d.nationalIdFront = formatUrl(d.nationalIdFront);
        d.nationalIdBack = formatUrl(d.nationalIdBack);
        d.driverLicenseFront = formatUrl(d.driverLicenseFront);
        d.driverLicenseBack = formatUrl(d.driverLicenseBack);
        d.vehicleRegistrationFront = formatUrl(d.vehicleRegistrationFront);
        d.vehicleRegistrationBack = formatUrl(d.vehicleRegistrationBack);

        if (d.vehiclePhotos && Array.isArray(d.vehiclePhotos)) {
          d.vehiclePhotos = d.vehiclePhotos.map((photo: string) =>
            formatUrl(photo),
          );
        }
      }

      return new ApiResponse(200, ride, Msg.RIDES_FETCHED);
    } catch (error) {
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async userRideHistory(userId: string) {
    try {
      const user = await this.userModel.findOne({
        _id: userId,
      });
      if (!user) {
        return new ApiResponse(404, {}, Msg.USER_NOT_FOUND);
      }

      const rides = await this.rideModel
        .find({
          user: user._id,
          status: {
            $in: [RideStatus.COMPLETED, RideStatus.CANCELLED],
          },
        })
        .populate('user')
        .populate({
          path: 'driver',
          populate: {
            path: 'user',
            select: 'firstName lastName email avatar phoneNumber countryCode',
          },
        })
        .populate('rideType')
        .lean();

      if (!rides || rides.length === 0) {
        return new ApiResponse(200, [], Msg.RIDES_NOT_FOUND);
      }

      const baseUrl = process.env.BASE_URL;

      const formattedRides = rides.map((ride: any) => {
        const u = ride.user as any;
        if (ride.user) {
          u.avatar = `${baseUrl}/api/v1/uploads/profile/${u.avatar}`;
        } else {
          u.avatar = process.env.DEFAULT_IMAGE;
        }

        if (ride.driver) {
          const d = ride.driver as any;

          if (d.user) {
            d.user.avatar = `${baseUrl}/api/v1/uploads/profile/${d.user.avatar}`;
          } else {
            d.user.avatar = process.env.DEFAULT_IMAGE;
          }

          const formatUrl = (fileName?: string) =>
            fileName && !fileName.startsWith('http')
              ? `${baseUrl}/api/v1/uploads/driver/${fileName}`
              : fileName;

          d.nationalIdFront = formatUrl(d.nationalIdFront);
          d.nationalIdBack = formatUrl(d.nationalIdBack);
          d.driverLicenseFront = formatUrl(d.driverLicenseFront);
          d.driverLicenseBack = formatUrl(d.driverLicenseBack);
          d.vehicleRegistrationFront = formatUrl(d.vehicleRegistrationFront);
          d.vehicleRegistrationBack = formatUrl(d.vehicleRegistrationBack);

          if (d.vehiclePhotos && Array.isArray(d.vehiclePhotos)) {
            d.vehiclePhotos = d.vehiclePhotos.map((photo: string) =>
              formatUrl(photo),
            );
          }
        }

        return ride;
      });

      return new ApiResponse(200, formattedRides, Msg.RIDES_FETCHED);
    } catch (error) {
      console.log(`error while fetching user ride history`, error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async driverArrived(userId: string, rideId: string) {
    try {
    } catch (error) {
      console.log(`error while driver arrived`, error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }
}
