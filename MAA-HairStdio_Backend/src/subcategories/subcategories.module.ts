import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubcategoriesService } from './subcategories.service';
import { SubcategoriesController } from './subcategories.controller';
import { Subcategory } from './subcategory.entity'; // ✅ Importación correcta
import { Category } from '../categories/category.entity';
import { Product } from '../products/product.entity'; // ✅ Si existe

@Module({
  imports: [TypeOrmModule.forFeature([Subcategory, Category, Product])], // ✅ Incluir todas las entidades
  providers: [SubcategoriesService],
  controllers: [SubcategoriesController],
  exports: [SubcategoriesService, TypeOrmModule], // ✅ Exportar TypeOrmModule si otros módulos lo necesitan
})
export class SubcategoriesModule {}
