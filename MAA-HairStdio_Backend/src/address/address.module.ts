import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Address } from './address.entity';
import { AddressService } from './address.service';
import { AddressController } from './address.controller';
/* import { ShippoModule } from 'src/shippo/shippo.module';
 */
@Module({
  imports: [TypeOrmModule.forFeature([Address])],
  providers: [AddressService],
  controllers: [AddressController],
  exports: [AddressService],
})
export class AddressModule {}
