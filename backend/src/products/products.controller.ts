import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ProductsService } from './products.service';
import { GetProductsDto } from './dto/get-products.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActivityInterceptor } from '../auth/interceptors/activity.interceptor';

@Controller('products')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ActivityInterceptor)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findPage(@Query() dto: GetProductsDto) {
    return this.productsService.findPage(dto);
  }
}
