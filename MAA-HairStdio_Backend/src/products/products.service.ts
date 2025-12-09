import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, In, Like, ILike, Between, Not, MoreThan } from 'typeorm';
import { Product, HairType, DesiredResult } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto, ProductFilterDto, StockOperation } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) { }

  // ✅ CREAR PRODUCTO con validaciones avanzadas
  async create(createProductDto: CreateProductDto): Promise<Product> {
    try {
      // Validar que la subcategoría existe
      const existingProduct = await this.productRepository.findOne({
        where: [
          { name: createProductDto.name },
          { slug: createProductDto.slug },
          { sku: createProductDto.sku }
        ].filter(condition => Object.values(condition)[0]) // Filtrar campos no definidos
      });

      if (existingProduct) {
        if (existingProduct.name === createProductDto.name) {
          throw new ConflictException('Ya existe un producto con este nombre');
        }
        if (existingProduct.slug === createProductDto.slug) {
          throw new ConflictException('Ya existe un producto con este slug');
        }
        if (existingProduct.sku === createProductDto.sku) {
          throw new ConflictException('Ya existe un producto con este SKU');
        }
      }

      // Validar precio original vs precio actual
      if (createProductDto.originalPrice && createProductDto.originalPrice <= createProductDto.price) {
        throw new BadRequestException('El precio original debe ser mayor al precio actual');
      }

      const product = this.productRepository.create(createProductDto);
      return await this.productRepository.save(product);
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al crear el producto: ' + error.message);
    }
  }

  // ✅ BUSCAR PRODUCTOS con filtros avanzados y paginación
  async findAll(filters: ProductFilterDto = {}) {
    const {
      search,
      subcategoryId,
      categoryId,
      brand,
      collection,
      type_hair,
      desired_result,
      type_product, // ← NUEVO FILTRO
      minPrice,
      maxPrice,
      minRating,
      isFeatured,
      isOnSale,
      inStock,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 10
    } = filters;

    // Validar parámetros de paginación
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(Math.max(1, limit), 100);

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.subcategory', 'subcategory')
      .leftJoinAndSelect('subcategory.category', 'category')
      .where('product.isActive = true');

    // ✅ FILTROS EXISTENTES - CORREGIDO
    if (search) {
      queryBuilder.andWhere(
        `(
          product.name ILIKE :search OR 
          product.description ILIKE :search OR 
          product.brand ILIKE :search OR 
          product.collection ILIKE :search OR 
          product.type_product::text ILIKE :search OR 
          product.tags::text ILIKE :search OR
          product.sku ILIKE :search
        )`,
        { search: `%${search}%` }
      );
    }

    if (subcategoryId) {
      queryBuilder.andWhere('product.subcategoryId = :subcategoryId', { subcategoryId });
    }

    if (categoryId) {
      queryBuilder.andWhere('subcategory.categoryId = :categoryId', { categoryId });
    }

    if (brand) {
      queryBuilder.andWhere('product.brand ILIKE :brand', { brand: `%${brand}%` });
    }

    if (collection) {
      queryBuilder.andWhere('product.collection ILIKE :collection', { collection: `%${collection}%` });
    }

    if (type_hair) {
      queryBuilder.andWhere('product.type_hair = :type_hair', { type_hair });
    }

    if (desired_result) {
      queryBuilder.andWhere('product.desired_result = :desired_result', { desired_result });
    }

    // ✅ NUEVO FILTRO: TYPE_PRODUCT
    if (type_product) {
      queryBuilder.andWhere('product.type_product = :type_product', { type_product });
    }

    // ✅ FILTROS DE PRECIO - CORREGIDO
    if (minPrice !== undefined) {
      queryBuilder.andWhere('product.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    if (minRating !== undefined) {
      queryBuilder.andWhere('product.rating >= :minRating', { minRating });
    }

    if (isFeatured !== undefined) {
      queryBuilder.andWhere('product.isFeatured = :isFeatured', { isFeatured });
    }

    if (isOnSale !== undefined) {
      queryBuilder.andWhere('product.isOnSale = :isOnSale', { isOnSale });
    }

    if (inStock !== undefined) {
      if (inStock) {
        queryBuilder.andWhere('product.stock > 0 AND product.isAvailable = true');
      } else {
        queryBuilder.andWhere('product.stock <= 0 OR product.isAvailable = false');
      }
    }

    // ✅ ORDENAMIENTO MEJORADO - CORREGIDO
    const applySorting = () => {
      switch (sortBy) {
        case 'price':
          queryBuilder.orderBy('product.price', sortOrder);
          break;
        case 'finalPrice': // ✅ CAMBIAR: Usar price en lugar de finalPrice
          queryBuilder.orderBy('product.price', sortOrder);
          break;
        case 'name':
          queryBuilder.orderBy('product.name', sortOrder);
          break;
        case 'rating':
          queryBuilder.orderBy('product.rating', sortOrder);
          // Segundo criterio: productos con más reseñas primero
          queryBuilder.addOrderBy('product.reviewCount', 'DESC');
          break;
        case 'popularity':
          // Ordenar por popularidad (combinación de vistas, compras y rating)
          queryBuilder.addSelect(`
            (product.viewCount * 0.3 + 
             product.purchaseCount * 0.5 + 
             product.rating * product.reviewCount * 0.2)
          `, 'popularity_score')
          .orderBy('popularity_score', sortOrder);
          break;
        case 'brand':
          queryBuilder.orderBy('product.brand', sortOrder);
          queryBuilder.addOrderBy('product.name', 'ASC');
          break;
        case 'viewCount':
          queryBuilder.orderBy('product.viewCount', sortOrder);
          break;
        case 'updatedAt':
          queryBuilder.orderBy('product.updatedAt', sortOrder);
          break;
        case 'createdAt':
        default:
          queryBuilder.orderBy('product.createdAt', sortOrder);
          break;
      }
    };

    applySorting();

    // ✅ PAGINACIÓN
    const offset = (validatedPage - 1) * validatedLimit;
    queryBuilder.skip(offset).take(validatedLimit);

    // ✅ EJECUTAR CONSULTA
    const [products, total] = await queryBuilder.getManyAndCount();

    return {
      data: products,
      meta: {
        total,
        page: validatedPage,
        limit: validatedLimit,
        totalPages: Math.ceil(total / validatedLimit),
        hasNextPage: validatedPage < Math.ceil(total / validatedLimit),
        hasPrevPage: validatedPage > 1,
      },
      filters: {
        applied: Object.keys(filters).length,
        search: search || null,
        category: categoryId || null,
        subcategory: subcategoryId || null,
        brand: brand || null,
        collection: collection || null,
        type_product: type_product || null, // ← NUEVO METADATA
        priceRange: minPrice || maxPrice ? { min: minPrice, max: maxPrice } : null,
        sorting: { sortBy, sortOrder }
      }
    };
  }

  // ✅ BUSCAR POR ID sin incrementar vistas (para uso interno)
  async findOneInternal(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id, isActive: true },
      relations: ['subcategory', 'subcategory.category'],
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    return product;
  }

  // ✅ BUSCAR POR ID con incremento de vistas (para usuarios)
  async findOne(id: string): Promise<Product> {
    const product = await this.findOneInternal(id);

    // Incrementar contador de vistas solo para consultas de usuarios
    await this.incrementViewCount(id);

    return product;
  }

  // ✅ ACTUALIZAR PRODUCTO con validaciones (usar método interno)
  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOneInternal(id); // ✅ No incrementar vistas

    // Manejar operaciones especiales de stock
    if (updateProductDto.stockOperation && updateProductDto.stockAmount !== undefined) {
      await this.updateStock(id, updateProductDto.stockOperation, updateProductDto.stockAmount);
      delete updateProductDto.stockOperation;
      delete updateProductDto.stockAmount;
    }

    // Validar campos únicos si se están actualizando
    if (updateProductDto.name || updateProductDto.slug || updateProductDto.sku) {
      const conditions: Array<{ name?: string; slug?: string; sku?: string }> = [];
      if (updateProductDto.name) conditions.push({ name: updateProductDto.name });
      if (updateProductDto.slug) conditions.push({ slug: updateProductDto.slug });
      if (updateProductDto.sku) conditions.push({ sku: updateProductDto.sku });

      if (conditions.length > 0) {
        const conflictProduct = await this.productRepository.findOne({
          where: conditions
        });

        if (conflictProduct && conflictProduct.id !== id) {
          throw new ConflictException('Ya existe otro producto con estos datos únicos');
        }
      }
    }

    // Actualizar producto
    await this.productRepository.update(id, updateProductDto);
    return await this.findOneInternal(id); // ✅ No incrementar vistas
  }

  // ✅ ELIMINAR PRODUCTO (soft delete)
  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.update(id, { isActive: false });
  }

  // ✅ GESTIÓN DE STOCK (usar método interno)
  async updateStock(id: string, operation: StockOperation, amount: number): Promise<Product> {
    const product = await this.findOneInternal(id); // ✅ No incrementar vistas

    if (!product.trackInventory) {
      throw new BadRequestException('Este producto no maneja inventario');
    }

    let newStock: number;

    switch (operation) {
      case StockOperation.SET:
        newStock = amount;
        break;
      case StockOperation.ADD:
        newStock = product.stock + amount;
        break;
      case StockOperation.SUBTRACT:
        newStock = product.stock - amount;
        if (newStock < 0) {
          throw new BadRequestException('No hay suficiente stock disponible');
        }
        break;
      default:
        throw new BadRequestException('Operación de stock no válida');
    }

    await this.productRepository.update(id, {
      stock: newStock,
      isAvailable: newStock > 0 || !product.trackInventory
    });

    return await this.findOneInternal(id); // ✅ No incrementar vistas
  }

  // ✅ INCREMENTAR CONTADOR DE VISTAS
  async incrementViewCount(id: string): Promise<void> {
    await this.productRepository.increment({ id }, 'viewCount', 1);
  }

  // ✅ INCREMENTAR CONTADOR DE COMPRAS
  async incrementPurchaseCount(id: string, quantity: number = 1): Promise<void> {
    await this.productRepository.update(id, {
      purchaseCount: () => `"purchaseCount" + ${quantity}`,
      lastPurchaseAt: new Date()
    });
  }

  // ✅ PRODUCTOS RELACIONADOS (usar método interno)
  async getRelatedProducts(id: string, limit: number = 4): Promise<Product[]> {
    const product = await this.findOneInternal(id); // ✅ No incrementar vistas

    return await this.productRepository.find({
      where: {
        subcategoryId: product.subcategoryId,
        isActive: true,
        id: Not(id)
      },
      relations: ['subcategory'],
      take: limit,
      order: { rating: 'DESC', viewCount: 'DESC' }
    });
  }

  // ✅ PRODUCTOS DESTACADOS
  async getFeaturedProducts(limit: number = 8): Promise<Product[]> {
    return await this.productRepository.find({
      where: { isFeatured: true, isActive: true, isAvailable: true },
      relations: ['subcategory', 'subcategory.category'],
      take: limit,
      order: { createdAt: 'DESC' }
    });
  }

  // ✅ PRODUCTOS EN OFERTA
  async getProductsOnSale(limit: number = 12): Promise<Product[]> {
    return await this.productRepository.find({
      where: {
        isActive: true,
        isAvailable: true
      },
      relations: ['subcategory'],
      take: limit,
      order: { discountPercentage: 'DESC' }
    }).then(products =>
      products.filter(product => product.discountPercentage > 0)
    );
  }

  // ✅ PRODUCTOS MÁS VENDIDOS
  async getBestSellingProducts(limit: number = 10): Promise<Product[]> {
    return await this.productRepository.find({
      where: { isActive: true, isAvailable: true },
      relations: ['subcategory'],
      take: limit,
      order: { purchaseCount: 'DESC' }
    });
  }

  // ✅ PRODUCTOS NUEVOS
  async getNewProducts(limit: number = 8): Promise<Product[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return await this.productRepository.find({
      where: {
        isActive: true,
        isAvailable: true,
        createdAt: MoreThan(thirtyDaysAgo)
      },
      relations: ['subcategory'],
      take: limit,
      order: { createdAt: 'DESC' }
    });
  }

  // ✅ BUSCAR POR MÚLTIPLES IDs (para carrito/wishlist)
  async findByIds(ids: string[]): Promise<Product[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    return await this.productRepository.find({
      where: {
        id: In(ids),
        isActive: true
      },
      relations: ['subcategory']
    });
  }

  // ✅ VERIFICAR DISPONIBILIDAD (usar método interno)
  async checkAvailability(productId: string, quantity: number): Promise<{
    available: boolean;
    stock: number;
    message?: string;
  }> {
    const product = await this.findOneInternal(productId); // ✅ No incrementar vistas

    if (!product.isAvailable) {
      return {
        available: false,
        stock: 0,
        message: 'Producto no disponible'
      };
    }

    if (!product.trackInventory) {
      return {
        available: true,
        stock: Infinity,
        message: 'Stock ilimitado'
      };
    }

    if (product.stock < quantity) {
      return {
        available: false,
        stock: product.stock,
        message: `Solo hay ${product.stock} unidades disponibles`
      };
    }

    return {
      available: true,
      stock: product.stock,
      message: 'Producto disponible'
    };
  }


  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { slug, isActive: true },
      relations: ['subcategory', 'subcategory.category'], // ✅ CORREGIDO: Usar la relación correcta
    });
    
    if (!product) {
      throw new NotFoundException(`Producto con slug "${slug}" no encontrado`);
    }

    // ✅ OPCIONAL: Incrementar vistas para consulta de usuario
    await this.incrementViewCount(product.id);

    return product;
  }


  // ✅ ESTADÍSTICAS (usar método interno)
  async getProductStats(id: string) {
    const product = await this.findOneInternal(id); // ✅ No incrementar vistas

    return {
      id: product.id,
      name: product.name,
      views: product.viewCount,
      purchases: product.purchaseCount,
      rating: product.rating,
      reviews: product.reviewCount,
      stock: product.stock,
      stockStatus: product.stockStatus,
      popularity: product.popularity,
      isOnSale: product.isOnSale,
      finalPrice: product.finalPrice,
      createdAt: product.createdAt,
      lastPurchaseAt: product.lastPurchaseAt
    };
  }

  // ✅ BÚSQUEDA AVANZADA con texto completo
  async searchProducts(query: string, filters: Partial<ProductFilterDto> = {}) {
    const {
      subcategoryId,
      categoryId,
      brand,
      collection,
      type_product, // ← NUEVO FILTRO EN BÚSQUEDA
      limit = 20,
      page = 1
    } = filters;

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.subcategory', 'subcategory')
      .leftJoinAndSelect('subcategory.category', 'category')
      .where('product.isActive = true AND product.isAvailable = true');

    // Búsqueda con texto completo y ranking
    if (query && query.trim()) {
      queryBuilder
        .addSelect(`
          ts_rank_cd(
            to_tsvector('spanish', product.name || ' ' || COALESCE(product.description, '') || ' ' || COALESCE(product.brand, '') || ' ' || COALESCE(product.collection, '') || ' ' || COALESCE(product.type_product, '')),
            plainto_tsquery('spanish', :query)
          )
        `, 'search_rank')
        .andWhere(`
          to_tsvector('spanish', product.name || ' ' || COALESCE(product.description, '') || ' ' || COALESCE(product.brand, '') || ' ' || COALESCE(product.collection, '') || ' ' || COALESCE(product.type_product, ''))
          @@ plainto_tsquery('spanish', :query)
        `, { query: query.trim() })
        .orderBy('search_rank', 'DESC')
        .addOrderBy('product.rating', 'DESC');
    }

    if (subcategoryId) {
      queryBuilder.andWhere('product.subcategoryId = :subcategoryId', { subcategoryId });
    }

    if (categoryId) {
      queryBuilder.andWhere('subcategory.categoryId = :categoryId', { categoryId });
    }

    if (brand) {
      queryBuilder.andWhere('product.brand ILIKE :brand', { brand: `%${brand}%` });
    }

    // ✅ NUEVO FILTRO EN BÚSQUEDA
    if (collection) {
      queryBuilder.andWhere('product.collection ILIKE :collection', { collection: `%${collection}%` });
    }

    // ✅ NUEVO FILTRO EN BÚSQUEDA
    if (type_product) {
      queryBuilder.andWhere('product.type_product = :type_product', { type_product });
    }

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [products, total] = await queryBuilder.getManyAndCount();

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        query: query?.trim() || null
      }
    };
  }

  // ✅ NUEVO: Obtener todas las colecciones disponibles
  async getAvailableCollections(): Promise<Array<{ collection: string; count: number }>> {
    const result = await this.productRepository
      .createQueryBuilder('product')
      .select('product.collection', 'collection')
      .addSelect('COUNT(*)', 'count')
      .where('product.isActive = true')
      .andWhere('product.collection IS NOT NULL')
      .andWhere('product.collection != \'\'')
      .groupBy('product.collection')
      .orderBy('count', 'DESC')
      .addOrderBy('product.collection', 'ASC')
      .getRawMany();

    return result.map(item => ({
      collection: item.collection,
      count: parseInt(item.count)
    }));
  }

  // ✅ NUEVO: Obtener todos los tipos de producto disponibles
  async getAvailableProductTypes(): Promise<Array<{ type_product: string; count: number }>> {
    const result = await this.productRepository
      .createQueryBuilder('product')
      .select('product.type_product', 'type_product')
      .addSelect('COUNT(*)', 'count')
      .where('product.isActive = true')
      .andWhere('product.type_product IS NOT NULL')
      .groupBy('product.type_product')
      .orderBy('count', 'DESC')
      .addOrderBy('product.type_product', 'ASC')
      .getRawMany();

    return result.map(item => ({
      type_product: item.type_product,
      count: parseInt(item.count)
    }));
  }
}
