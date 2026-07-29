import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { LoginCompanyDto } from './dto/login-company.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/common/middlewares/multer';

@ApiTags('Company')
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post('/register')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('documents', 10, multerConfig('company')))
  register(
    @Body() dto: RegisterCompanyDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.companyService.register(dto, files);
  }

  @Post('/login')
  login(@Body() dto: LoginCompanyDto) {
    return this.companyService.login(dto);
  }
}
