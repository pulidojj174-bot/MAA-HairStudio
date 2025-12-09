import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { SubcategoriesModule } from './subcategories/subcategories.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { CartModule } from './cart/cart.module';
/* import { OrdersModule } from './orders/orders.module'; */
import { AddressModule } from './address/address.module';
/* import { ShippoModule } from './shippo/shippo.module'; */
import { OrdersModule } from './orders/orders.module';
import { HealthModule } from './healt/healt.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Hace que ConfigModule esté disponible globalmente
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('PGHOST'),
        port: configService.get<number>('PGPORT'),
        username: configService.get<string>('PGUSER'),
        password: configService.get<string>('PGPASSWORD'),
        database: configService.get<string>('PGDATABASE'),
        entities: [__dirname + '/**/*.entity.{js,ts}'],
        synchronize: true,
        ssl: true,
        dropSchema: false, // ✅ No eliminar esquema automáticamente
        migrationsRun: false, // ✅ No ejecutar migraciones automáticamente
        logging: ['error', 'warn'], // ✅ Solo logs de errores y advertencias
      }),
      inject: [ConfigService],
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          service: 'gmail',
          auth: {
            user: configService.get<string>('CORREO_PRUEBA'),
            pass: configService.get<string>('CODIGO_VERIFICACION'),
          },
        },
        defaults: {
          from: '"No Reply" <hairstudiomaa@gmail.com>',
        },
      }),
    }),
    UsersModule,
    AuthModule,
    ProductsModule,
    CategoriesModule,
    SubcategoriesModule,
    WishlistModule,
    CartModule,
    /* OrdersModule, */
    AddressModule,
    OrdersModule,
    HealthModule,
    /* ShippoModule, */
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
