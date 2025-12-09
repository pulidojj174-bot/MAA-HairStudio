import { 
  Injectable, 
  NotFoundException, 
  ConflictException,
  BadRequestException 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Subcategory } from './subcategory.entity';
import { Category } from '../categories/category.entity';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';

@Injectable()
export class SubcategoriesService {
  constructor(
    @InjectRepository(Subcategory)
    private readonly subcategoryRepository: Repository<Subcategory>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(createSubcategoryDto: CreateSubcategoryDto): Promise<Subcategory> {
    // ✅ MEJORA: Verificar que la categoría existe
    const category = await this.categoryRepository.findOneBy({
      id: createSubcategoryDto.categoryId,
    });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada.');
    }

    // ✅ NUEVO: Generar slug automático si no se proporciona
    if (!createSubcategoryDto.slug && createSubcategoryDto.name) {
      createSubcategoryDto.slug = this.generateSlug(createSubcategoryDto.name);
    }

    // ✅ MEJORA: Verificar unicidad del nombre y slug dentro de la categoría
    await this.checkUniqueness(
      createSubcategoryDto.name, 
      createSubcategoryDto.slug,
      createSubcategoryDto.categoryId
    );

    const subcategory = this.subcategoryRepository.create({
      ...createSubcategoryDto,
      category,
    });

    try {
      return await this.subcategoryRepository.save(subcategory);
    } catch (error) {
      if (error.code === '23505') { // Duplicate key error
        throw new ConflictException('Ya existe una subcategoría con ese nombre o slug en esta categoría.');
      }
      throw error;
    }
  }

  // ✅ MEJORA: findAll con paginación y filtros
  async findAll(
    page: number = 1,
    limit: number = 10,
    categoryId?: string,
    search?: string,
    includeProducts: boolean = false
  ): Promise<{
    data: Subcategory[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryBuilder = this.subcategoryRepository.createQueryBuilder('subcategory')
      .leftJoinAndSelect('subcategory.category', 'category');

    // ✅ Incluir productos si se solicita
    if (includeProducts) {
      queryBuilder.leftJoinAndSelect('subcategory.products', 'products');
    }

    // ✅ Filtro por categoría
    if (categoryId) {
      queryBuilder.andWhere('subcategory.categoryId = :categoryId', { categoryId });
    }

    // ✅ Filtro de búsqueda
    if (search) {
      queryBuilder.andWhere(
        '(LOWER(subcategory.name) LIKE LOWER(:search) OR LOWER(subcategory.description) LIKE LOWER(:search))',
        { search: `%${search}%` }
      );
    }

    // ✅ Ordenamiento
    queryBuilder.orderBy('category.displayOrder', 'ASC')
                .addOrderBy('subcategory.displayOrder', 'ASC')
                .addOrderBy('subcategory.name', 'ASC');

    // ✅ Paginación
    const [subcategories, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      data: subcategories,
      total,
      page,
      limit,
      totalPages,
    };
  }

  // ✅ NUEVO: Obtener subcategorías por categoría sin paginación
  async findByCategory(categoryId: string): Promise<Subcategory[]> {
    const category = await this.categoryRepository.findOneBy({ id: categoryId });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada.');
    }

    return this.subcategoryRepository.find({
      where: { categoryId },
      order: { displayOrder: 'ASC', name: 'ASC' },
      select: ['id', 'name', 'description', 'displayOrder', 'color', 'icon'],
    });
  }

  // ✅ NUEVO: Obtener todas las subcategorías para select (sin paginación)
  async findAllForSelect(): Promise<Array<{
    id: string;
    name: string;
    categoryId: string;
    categoryName: string;
  }>> {
    const subcategories = await this.subcategoryRepository.find({
      relations: ['category'],
      select: {
        id: true,
        name: true,
        categoryId: true,
        category: { id: true, name: true }
      },
      order: { 
        category: { displayOrder: 'ASC', name: 'ASC' },
        displayOrder: 'ASC',
        name: 'ASC'
      }
    });

    return subcategories.map(sub => ({
      id: sub.id,
      name: sub.name,
      categoryId: sub.categoryId,
      categoryName: sub.category.name,
    }));
  }

  async findOne(id: string): Promise<Subcategory> {
    const subcategory = await this.subcategoryRepository.findOne({
      where: { id },
      relations: ['category'],
    });
    
    if (!subcategory) {
      throw new NotFoundException('Subcategoría no encontrada.');
    }
    
    return subcategory;
  }

  async update(id: string, updateSubcategoryDto: UpdateSubcategoryDto): Promise<Subcategory> {
    const subcategory = await this.subcategoryRepository.findOne({
      where: { id },
      relations: ['category'],
    });
    
    if (!subcategory) {
      throw new NotFoundException('Subcategoría no encontrada.');
    }

    // ✅ MEJORA: Si se cambia la categoría, verificar que existe
    if (updateSubcategoryDto.categoryId && updateSubcategoryDto.categoryId !== subcategory.categoryId) {
      const newCategory = await this.categoryRepository.findOneBy({
        id: updateSubcategoryDto.categoryId,
      });
      if (!newCategory) {
        throw new NotFoundException('La nueva categoría no encontrada.');
      }
      subcategory.category = newCategory;
    }

    // ✅ NUEVO: Generar slug si se actualiza el nombre y no hay slug
    if (updateSubcategoryDto.name && !updateSubcategoryDto.slug) {
      updateSubcategoryDto.slug = this.generateSlug(updateSubcategoryDto.name);
    }

    // ✅ MEJORA: Verificar unicidad del nombre y slug si se actualiza
    if (updateSubcategoryDto.name || updateSubcategoryDto.slug) {
      const categoryIdToCheck = updateSubcategoryDto.categoryId || subcategory.categoryId;
      await this.checkUniqueness(
        updateSubcategoryDto.name, 
        updateSubcategoryDto.slug,
        categoryIdToCheck, 
        id
      );
    }

    Object.assign(subcategory, updateSubcategoryDto);

    try {
      return await this.subcategoryRepository.save(subcategory);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Ya existe una subcategoría con ese nombre o slug en esta categoría.');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    const subcategory = await this.subcategoryRepository.findOne({
      where: { id },
      relations: ['products']
    });
    
    if (!subcategory) {
      throw new NotFoundException('Subcategoría no encontrada.');
    }

    // ✅ MEJORA: Verificar si tiene productos antes de eliminar
    if (subcategory.products && subcategory.products.length > 0) {
      throw new BadRequestException(
        `No se puede eliminar la subcategoría porque tiene ${subcategory.products.length} producto(s) asociado(s).`
      );
    }

    await this.subcategoryRepository.delete(id);
    return { message: 'Subcategoría eliminada correctamente.' };
  }

  // ✅ NUEVO: Reordenar subcategorías dentro de una categoría
  async reorderSubcategories(
    categoryId: string,
    subcategoryOrders: Array<{ id: string; displayOrder: number }>
  ): Promise<{ message: string }> {
    // Verificar que la categoría existe
    const category = await this.categoryRepository.findOneBy({ id: categoryId });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada.');
    }

    // Verificar que todas las subcategorías pertenecen a la categoría
    const subcategoryIds = subcategoryOrders.map(item => item.id);
    if (subcategoryIds.length === 0) {
      throw new BadRequestException('No se proporcionaron subcategorías para reordenar.');
    }

    const subcategories = await this.subcategoryRepository.find({
      where: { categoryId },
      select: ['id', 'categoryId']
    });

    const validIds = subcategories.map(sub => sub.id);
    const invalidIds = subcategoryIds.filter(id => !validIds.includes(id));
    
    if (invalidIds.length > 0) {
      throw new BadRequestException('Algunas subcategorías no pertenecen a la categoría especificada.');
    }

    // Actualizar orden
    const promises = subcategoryOrders.map(async ({ id, displayOrder }) => {
      await this.subcategoryRepository.update(id, { displayOrder });
    });

    await Promise.all(promises);
    return { message: 'Orden de subcategorías actualizado correctamente.' };
  }

  // ✅ CORREGIDO: Obtener estadísticas de subcategorías con consultas más simples
  async getSubcategoriesStats(): Promise<{
    totalSubcategories: number;
    subcategoriesWithProducts: number;
    averageProductsPerSubcategory: number;
    categoriesWithSubcategories: number;
  }> {
    try {
      // ✅ 1. Total de subcategorías
      const totalSubcategories = await this.subcategoryRepository.count();
      
      // ✅ 2. Subcategorías que tienen productos (usando DISTINCT)
      const subcategoriesWithProductsCount = await this.subcategoryRepository
        .createQueryBuilder('subcategory')
        .innerJoin('subcategory.products', 'product')
        .select('COUNT(DISTINCT subcategory.id)', 'count')
        .getRawOne();

      // ✅ 3. Promedio de productos por subcategoría (consulta más simple)
      const productCountsRaw = await this.subcategoryRepository
        .createQueryBuilder('subcategory')
        .leftJoin('subcategory.products', 'product')
        .select([
          'subcategory.id as subcategoryId',
          'COUNT(product.id) as productCount'
        ])
        .groupBy('subcategory.id')
        .getRawMany();

      // ✅ 4. Calcular promedio en JavaScript (más confiable)
      const totalProductsCount = productCountsRaw.reduce(
        (sum, item) => sum + parseInt(item.productcount || '0'), 
        0
      );
      
      const averageProductsPerSubcategory = totalSubcategories > 0 
        ? totalProductsCount / totalSubcategories 
        : 0;

      // ✅ 5. Categorías que tienen subcategorías
      const categoriesWithSubcategoriesCount = await this.subcategoryRepository
        .createQueryBuilder('subcategory')
        .select('COUNT(DISTINCT subcategory.categoryId)', 'count')
        .getRawOne();

      return {
        totalSubcategories,
        subcategoriesWithProducts: parseInt(subcategoriesWithProductsCount?.count || '0'),
        averageProductsPerSubcategory: Math.round(averageProductsPerSubcategory * 100) / 100, // 2 decimales
        categoriesWithSubcategories: parseInt(categoriesWithSubcategoriesCount?.count || '0'),
      };

    } catch (error) {
      console.error('❌ Error en getSubcategoriesStats:', error);
      
      // ✅ FALLBACK: Devolver estadísticas básicas si hay error
      const totalSubcategories = await this.subcategoryRepository.count();
      
      return {
        totalSubcategories,
        subcategoriesWithProducts: 0,
        averageProductsPerSubcategory: 0,
        categoriesWithSubcategories: 0,
      };
    }
  }

  // ✅ NUEVO: Buscar por slug
  async findBySlug(slug: string): Promise<Subcategory> {
    const subcategory = await this.subcategoryRepository.findOne({
      where: { slug },
      relations: ['category', 'products'],
    });
    
    if (!subcategory) {
      throw new NotFoundException(`Subcategoría con slug '${slug}' no encontrada.`);
    }
    
    return subcategory;
  }

  // ✅ MÉTODOS PRIVADOS DE UTILIDAD
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover diacríticos
      .replace(/[^a-z0-9\s-]/g, '') // Solo letras, números, espacios y guiones
      .replace(/\s+/g, '-') // Espacios a guiones
      .replace(/-+/g, '-') // Múltiples guiones a uno solo
      .replace(/^-|-$/g, ''); // Remover guiones al inicio y final
  }

  // ✅ MEJORADO: Verificar unicidad del nombre y slug
  private async checkUniqueness(
    name?: string, 
    slug?: string,
    categoryId?: string,
    excludeId?: string
  ): Promise<void> {
    if (name) {
      const existingByName = await this.subcategoryRepository.findOne({
        where: { 
          name: ILike(name),
          categoryId 
        }
      });
      
      if (existingByName && existingByName.id !== excludeId) {
        throw new ConflictException('Ya existe una subcategoría con ese nombre en esta categoría.');
      }
    }

    if (slug) {
      const existingBySlug = await this.subcategoryRepository.findOne({
        where: { 
          slug,
          categoryId 
        }
      });
      
      if (existingBySlug && existingBySlug.id !== excludeId) {
        throw new ConflictException('Ya existe una subcategoría con ese slug en esta categoría.');
      }
    }
  }

  // ✅ MÉTODO PRIVADO LEGACY (mantener para compatibilidad)
  private async checkNameUniqueness(
    name: string, 
    categoryId: string, 
    excludeId?: string
  ): Promise<void> {
    await this.checkUniqueness(name, undefined, categoryId, excludeId);
  }
}
