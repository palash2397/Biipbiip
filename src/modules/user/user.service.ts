import { Injectable } from '@nestjs/common';

import { ApiResponse } from 'src/helpers/ApiResponse';
import { generateOtp, getExpirationTime } from 'src/helpers/index';

@Injectable()
export class UserService {}
