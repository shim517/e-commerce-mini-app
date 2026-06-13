import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { RefreshTokensModule } from './refresh-tokens/refresh-tokens.module';
import { AuthModule } from './auth/auth.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.user'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        autoLoadEntities: true,
        // Use DATABASE_SYNC=true in docker-compose for demo; use migrations in real prod
        synchronize: config.get<boolean>('dbSync'),
        logging: config.get<boolean>('dbLogging'),
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
    UsersModule,
    ProductsModule,
    RefreshTokensModule,
    AuthModule,
  ],
})
export class AppModule {}
