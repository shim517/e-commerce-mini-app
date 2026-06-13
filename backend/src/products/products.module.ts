import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { RefreshTokensModule } from '../refresh-tokens/refresh-tokens.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), RefreshTokensModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
