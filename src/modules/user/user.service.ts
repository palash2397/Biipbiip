import { Injectable } from '@nestjs/common';

import { ApiResponse } from 'src/helpers/ApiResponse';
import { generateOtp, getExpirationTime } from 'src/helpers/index';

import { User, UserDocument } from './schema/user.schema';

@Injectable()
export class UserService {}
