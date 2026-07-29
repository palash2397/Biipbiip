import { Module } from '@nestjs/common';
import { AppController } from './app.controller';

import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/databese.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { AddressModule } from './modules/address/address.module';
import { RideTypeModule } from './modules/ride-type/ride-type.module';
import { FaqModule } from './modules/faq/faq.module';
import { SupportModule } from './modules/support/support.module';
import { DriverModule } from './modules/driver/driver.module';
import { SocketModule } from './modules/socket/socket.module';
import { RideModule } from './modules/ride/ride.module';
import { AvailableCarsModule } from './modules/available-cars/available-cars.module';
import { ChatModule } from './modules/chat/chat.module';
import { RatingModule } from './modules/rating/rating.module';
import { SuperadminModule } from './modules/superadmin/superadmin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    UserModule,
    AuthModule,
    AddressModule,
    RideTypeModule,
    FaqModule,
    SupportModule,
    DriverModule,
    SocketModule,
    RideModule,
    AvailableCarsModule,
    ChatModule,
    RatingModule,
    SuperadminModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
