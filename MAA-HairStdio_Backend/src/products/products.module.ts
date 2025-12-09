import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { Subcategory } from '../subcategories/subcategory.entity'; // <--- IMPORTA LA ENTIDAD
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Category } from '../categories/category.entity'; // <--- IMPORTA LA ENTIDAD Category

@Module({
  imports: [TypeOrmModule.forFeature([Product, Subcategory, Category])], // <--- AGREGA SUBCATEGORY Y Category AQUÍ
  providers: [ProductsService],
  controllers: [ProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}
