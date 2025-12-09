import { 
  Injectable, 
  NotFoundException, 
  ConflictException,
  BadRequestException 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    // ✅ MEJORA: Generar slug automático si no se proporciona
    if (!createCategoryDto.slug && createCategoryDto.name) {
      createCategoryDto.slug = this.generateSlug(createCategoryDto.name);
    }

    // ✅ MEJORA: Verificar unicidad de nombre y slug
    await this.checkUniqueness(createCategoryDto.name, createCategoryDto.slug);

    const category = this.categoryRepository.create(createCategoryDto);
    
    try {
      return await this.categoryRepository.save(category);
    } catch (error) {
      if (error.code === '23505') { // Duplicate key error
        throw new ConflictException('Ya existe una categoría con ese nombre o slug.');
      }
      throw error;
    }
  }

  // ✅ MEJORA: findAll con paginación y filtros opcionales
  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    includeSubcategories: boolean = true
  ): Promise<{
    data: Category[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryBuilder = this.categoryRepository.createQueryBuilder('category');

    // ✅ Incluir subcategorías si se solicita
    if (includeSubcategories) {
      queryBuilder.leftJoinAndSelect('category.subcategories', 'subcategories');
    }

    // ✅ Filtro de búsqueda opcional
    if (search) {
      queryBuilder.where(
        'LOWER(category.name) LIKE LOWER(:search) OR LOWER(category.description) LIKE LOWER(:search)',
        { search: `%${search}%` }
      );
    }

    // ✅ Ordenamiento por displayOrder y nombre
    queryBuilder.orderBy('category.displayOrder', 'ASC')
                .addOrderBy('category.name', 'ASC');

    // ✅ Paginación
    const [categories, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      data: categories,
      total,
      page,
      limit,
      totalPages,
    };
  }

  // ✅ NUEVO: Obtener todas las categorías sin paginación (para selects)
  async findAllForSelect(): Promise<Category[]> {
    return this.categoryRepository.find({
      select: ['id', 'name', 'slug', 'color', 'icon'],
      order: { displayOrder: 'ASC', name: 'ASC' }
    });
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['subcategories'],
    });
    
    if (!category) {
      throw new NotFoundException('Categoría no encontrada.');
    }
    
    return category;
  }

  // ✅ NUEVO: Buscar por slug
  async findBySlug(slug: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { slug },
      relations: ['subcategories'],
    });
    
    if (!category) {
      throw new NotFoundException(`Categoría con slug '${slug}' no encontrada.`);
    }
    
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const category = await this.categoryRepository.findOneBy({ id });
    if (!category) {
      throw new NotFoundException('Categoría no encontrada.');
    }

    // ✅ MEJORA: Generar slug si se actualiza el nombre y no hay slug
    if (updateCategoryDto.name && !updateCategoryDto.slug) {
      updateCategoryDto.slug = this.generateSlug(updateCategoryDto.name);
    }

    // ✅ MEJORA: Verificar unicidad al actualizar
    if (updateCategoryDto.name || updateCategoryDto.slug) {
      await this.checkUniqueness(
        updateCategoryDto.name, 
        updateCategoryDto.slug, 
        id
      );
    }

    Object.assign(category, updateCategoryDto);
    
    try {
      return await this.categoryRepository.save(category);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Ya existe una categoría con ese nombre o slug.');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['subcategories']
    });
    
    if (!category) {
      throw new NotFoundException('Categoría no encontrada.');
    }

    // ✅ MEJORA: Verificar si tiene subcategorías antes de eliminar
    if (category.subcategories && category.subcategories.length > 0) {
      throw new BadRequestException(
        `No se puede eliminar la categoría porque tiene ${category.subcategories.length} subcategoría(s) asociada(s).`
      );
    }

    await this.categoryRepository.delete(id);
    return { message: 'Categoría eliminada correctamente.' };
  }

  // ✅ MEJORADO: Reordenar categorías con validaciones robustas
  async reorderCategories(categoryOrders: Array<{ id: string; displayOrder: number }>): Promise<{ message: string }> {
    if (!categoryOrders || categoryOrders.length === 0) {
      throw new BadRequestException('No se proporcionaron categorías para reordenar');
    }

    // ✅ Verificar que todas las categorías existen
    const categoryIds = categoryOrders.map(item => item.id);
    const existingCategories = await this.categoryRepository.findByIds(categoryIds);
    
    if (existingCategories.length !== categoryIds.length) {
      const foundIds = existingCategories.map(cat => cat.id);
      const missingIds = categoryIds.filter(id => !foundIds.includes(id));
      throw new NotFoundException(`Categorías no encontradas: ${missingIds.join(', ')}`);
    }

    // ✅ Validar que no hay displayOrder duplicados
    const displayOrders = categoryOrders.map(item => item.displayOrder);
    const uniqueDisplayOrders = [...new Set(displayOrders)];
    
    if (displayOrders.length !== uniqueDisplayOrders.length) {
      throw new BadRequestException('No se pueden tener valores de displayOrder duplicados');
    }

    // ✅ Validar que todos los displayOrder son números válidos
    for (const order of categoryOrders) {
      if (!Number.isInteger(order.displayOrder) || order.displayOrder < 0) {
        throw new BadRequestException(`displayOrder debe ser un número entero mayor o igual a 0. Valor inválido: ${order.displayOrder}`);
      }
    }

    // ✅ Actualizar en transacción para mantener consistencia
    await this.categoryRepository.manager.transaction(async (manager) => {
      const updatePromises = categoryOrders.map(({ id, displayOrder }) => 
        manager.update(Category, id, { displayOrder })
      );
      
      await Promise.all(updatePromises);
    });

    return { message: `Orden de ${categoryOrders.length} categorías actualizado correctamente.` };
  }

  // ✅ CORREGIDO: Obtener estadísticas de categorías con consultas más simples
  async getCategoriesStats(): Promise<{
    totalCategories: number;
    categoriesWithSubcategories: number;
    averageSubcategoriesPerCategory: number;
  }> {
    try {
      // ✅ Total de categorías
      const totalCategories = await this.categoryRepository.count();
      
      // ✅ Categorías que tienen subcategorías (usando DISTINCT)
      const categoriesWithSubcategoriesCount = await this.categoryRepository
        .createQueryBuilder('category')
        .innerJoin('category.subcategories', 'subcategory')
        .select('COUNT(DISTINCT category.id)', 'count')
        .getRawOne();

      // ✅ Promedio de subcategorías por categoría (consulta más simple)
      const subcategoryCountsRaw = await this.categoryRepository
        .createQueryBuilder('category')
        .leftJoin('category.subcategories', 'subcategory')
        .select([
          'category.id as categoryId',
          'COUNT(subcategory.id) as subcategoryCount'
        ])
        .groupBy('category.id')
        .getRawMany();

      // ✅ Calcular promedio en JavaScript (más confiable)
      const totalSubcategoriesCount = subcategoryCountsRaw.reduce(
        (sum, item) => sum + parseInt(item.subcategorycount || '0'), 
        0
      );
      
      const averageSubcategoriesPerCategory = totalCategories > 0 
        ? totalSubcategoriesCount / totalCategories 
        : 0;

      return {
        totalCategories,
        categoriesWithSubcategories: parseInt(categoriesWithSubcategoriesCount?.count || '0'),
        averageSubcategoriesPerCategory: Math.round(averageSubcategoriesPerCategory * 100) / 100, // 2 decimales
      };

    } catch (error) {
      console.error('❌ Error en getCategoriesStats:', error);
      
      // ✅ FALLBACK: Devolver estadísticas básicas si hay error
      const totalCategories = await this.categoryRepository.count();
      
      return {
        totalCategories,
        categoriesWithSubcategories: 0,
        averageSubcategoriesPerCategory: 0,
      };
    }
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

  private async checkUniqueness(
    name?: string, 
    slug?: string, 
    excludeId?: string
  ): Promise<void> {
    if (name) {
      const existingByName = await this.categoryRepository.findOne({
        where: { name: ILike(name) }
      });
      
      if (existingByName && existingByName.id !== excludeId) {
        throw new ConflictException('Ya existe una categoría con ese nombre.');
      }
    }

    if (slug) {
      const existingBySlug = await this.categoryRepository.findOne({
        where: { slug }
      });
      
      if (existingBySlug && existingBySlug.id !== excludeId) {
        throw new ConflictException('Ya existe una categoría con ese slug.');
      }
    }
  }
}
