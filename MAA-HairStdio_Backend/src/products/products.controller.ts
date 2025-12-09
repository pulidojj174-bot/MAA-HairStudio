import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, DesiredResult, HairType, ProductType } from './dto/create-product.dto';
import { UpdateProductDto, ProductFilterDto, StockOperation } from './dto/update-product.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ✅ GRUPO 1: ENDPOINTS ESPECÍFICOS (van primero para evitar conflictos)
  
  // Lista de productos con filtros (debe ir primero)
  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('subcategoryId') subcategoryId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brand') brand?: string,
    @Query('collection') collection?: string,
    @Query('type_hair') type_hair?: HairType,
    @Query('desired_result') desired_result?: DesiredResult,
    @Query('type_product') type_product?: ProductType, // ← NUEVO PARÁMETRO
    @Query('minPrice', new DefaultValuePipe(0)) minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('minRating') minRating?: number,
    @Query('isFeatured') isFeatured?: boolean,
    @Query('isOnSale') isOnSale?: boolean,
    @Query('inStock') inStock?: boolean,
    @Query('sortBy', new DefaultValuePipe('createdAt')) sortBy?: string,
    @Query('sortOrder', new DefaultValuePipe('DESC')) sortOrder?: 'ASC' | 'DESC',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    const filters: ProductFilterDto = {
      search,
      subcategoryId,
      categoryId,
      brand,
      collection,
      type_hair,
      desired_result,
      type_product, // ← INCLUIR EN FILTROS
      minPrice,
      maxPrice,
      minRating,
      isFeatured,
      isOnSale,
      inStock,
      sortBy: sortBy as any,
      sortOrder,
      page,
      limit,
    };

    const result = await this.productsService.findAll(filters);
    return {
      success: true,
      message: 'Productos obtenidos exitosamente',
      ...result,
    };
  }

  // Crear producto (Admin)
  @Post()
  @UseGuards(AuthGuard('jwt'),RolesGuard)
  @Roles('admin', 'custom')
  async create(@Body() createProductDto: CreateProductDto) {
    const product = await this.productsService.create(createProductDto);
    return {
      success: true,
      message: 'Producto creado exitosamente',
      data: product,
    };
  }

  // Obtener múltiples productos por IDs
  @Post('by-ids')
  async findByIds(@Body() body: { ids: string[] }) {
    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      throw new BadRequestException('Se requiere un array de IDs válido');
    }

    const products = await this.productsService.findByIds(body.ids);
    return {
      success: true,
      message: 'Productos obtenidos exitosamente',
      data: products,
      count: products.length,
      requested: body.ids.length,
      found: products.length,
    };
  }

  // ✅ GRUPO 2: ENDPOINTS DE COLECCIONES ESPECÍFICAS

  @Get('featured')
  async getFeaturedProducts(
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number
  ) {
    const products = await this.productsService.getFeaturedProducts(limit);
    return {
      success: true,
      message: 'Productos destacados obtenidos exitosamente',
      data: products,
      count: products.length,
    };
  }

  @Get('on-sale')
  async getProductsOnSale(
    @Query('limit', new DefaultValuePipe(12), ParseIntPipe) limit: number
  ) {
    const products = await this.productsService.getProductsOnSale(limit);
    return {
      success: true,
      message: 'Productos en oferta obtenidos exitosamente',
      data: products,
      count: products.length,
    };
  }

  @Get('best-sellers')
  async getBestSellingProducts(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
  ) {
    const products = await this.productsService.getBestSellingProducts(limit);
    return {
      success: true,
      message: 'Productos más vendidos obtenidos exitosamente',
      data: products,
      count: products.length,
    };
  }

  @Get('new-arrivals')
  async getNewProducts(
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number
  ) {
    const products = await this.productsService.getNewProducts(limit);
    return {
      success: true,
      message: 'Productos nuevos obtenidos exitosamente',
      data: products,
      count: products.length,
    };
  }

  // ✅ GRUPO 3: BÚSQUEDA POR SLUG (antes de los IDs dinámicos)

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    const product = await this.productsService.findBySlug(slug);
    return {
      success: true,
      message: 'Producto obtenido exitosamente',
      data: product,
    };
  }

  // ✅ GRUPO 4: ENDPOINTS CON PARÁMETROS UUID (van después de las rutas específicas)

  @Get(':id/related')
  async getRelatedProducts(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', new DefaultValuePipe(4), ParseIntPipe) limit: number
  ) {
    const products = await this.productsService.getRelatedProducts(id, limit);
    return {
      success: true,
      message: 'Productos relacionados obtenidos exitosamente',
      data: products,
      count: products.length,
    };
  }

  @Get(':id/availability')
  async checkAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('quantity', new DefaultValuePipe(1), ParseIntPipe) quantity: number
  ) {
    if (quantity < 1) {
      throw new BadRequestException('La cantidad debe ser mayor a 0');
    }

    const availability = await this.productsService.checkAvailability(id, quantity);
    return {
      success: true,
      message: 'Disponibilidad verificada',
      data: availability,
    };
  }

  @Get(':id/stats')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'custom')
  async getProductStats(@Param('id', ParseUUIDPipe) id: string) {
    const stats = await this.productsService.getProductStats(id);
    return {
      success: true,
      message: 'Estadísticas obtenidas exitosamente',
      data: stats,
    };
  }

  // ✅ GRUPO 5: ENDPOINT GENÉRICO POR ID (DEBE IR AL FINAL)

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const product = await this.productsService.findOne(id);
    return {
      success: true,
      message: 'Producto obtenido exitosamente',
      data: product,
    };
  }

  // ✅ GRUPO 6: ENDPOINTS DE MODIFICACIÓN

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'custom')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto
  ) {
    const product = await this.productsService.update(id, updateProductDto);
    return {
      success: true,
      message: 'Producto actualizado exitosamente',
      data: product,
    };
  }

  @Patch(':id/stock')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'custom')
  async updateStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() stockData: { operation: StockOperation; amount: number; reason?: string }
  ) {
    const { operation, amount, reason } = stockData;
    
    if (!operation || amount === undefined) {
      throw new BadRequestException('Operación y cantidad son requeridas');
    }

    const product = await this.productsService.updateStock(id, operation, amount);
    return {
      success: true,
      message: `Stock ${operation === 'set' ? 'establecido' : operation === 'add' ? 'aumentado' : 'reducido'} exitosamente`,
      data: {
        id: product.id,
        name: product.name,
        previousStock: operation === 'set' ? null : (operation === 'add' ? product.stock - amount : product.stock + amount),
        currentStock: product.stock,
        operation,
        amount,
        reason: reason || 'Sin razón especificada',
        timestamp: new Date(),
      },
    };
  }

  @Patch(':id/increment-views')
  async incrementViews(@Param('id', ParseUUIDPipe) id: string) {
    await this.productsService.incrementViewCount(id);
    return {
      success: true,
      message: 'Vista registrada exitosamente',
    };
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'custom')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.productsService.remove(id);
    return {
      success: true,
      message: 'Producto eliminado exitosamente',
    };
  }

  // ✅ AGREGAR ESTE ENDPOINT después de los otros endpoints específicos
  @Get('search')
  async searchProducts(
    @Query('q') query: string,
    @Query('subcategoryId') subcategoryId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brand') brand?: string,
    @Query('collection') collection?: string,
    @Query('type_product') type_product?: ProductType, // ← NUEVO PARÁMETRO
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number
  ) {
    if (!query || query.trim().length < 2) {
      throw new BadRequestException('El término de búsqueda debe tener al menos 2 caracteres');
    }

    const filters = {
      subcategoryId,
      categoryId, 
      brand,
      collection,
      type_product, // ← INCLUIR EN FILTROS
      page,
      limit
    };

    const result = await this.productsService.searchProducts(query, filters);
    
    return {
      success: true,
      message: 'Búsqueda realizada exitosamente',
      ...result,
    };
  }

  // ✅ NUEVO: Obtener productos por colección
  @Get('collection/:collectionName')
  async getProductsByCollection(
    @Param('collectionName') collectionName: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number
  ) {
    const filters: ProductFilterDto = {
      collection: collectionName,
      limit,
      page
    };

    const result = await this.productsService.findAll(filters);
    return {
      success: true,
      message: `Productos de la colección "${collectionName}" obtenidos exitosamente`,
      ...result,
    };
  }

  // ✅ NUEVO: Obtener todas las colecciones disponibles
  @Get('collections/list')
  async getAvailableCollections() {
    // Este método necesita ser implementado en el service
    const collections = await this.productsService.getAvailableCollections();
    return {
      success: true,
      message: 'Colecciones disponibles obtenidas exitosamente',
      data: collections,
    };
  }

  // ✅ NUEVO: Obtener productos por tipo
  @Get('type/:productType')
  async getProductsByType(
    @Param('productType') productType: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number
  ) {
    const filters: ProductFilterDto = {
      type_product: productType as ProductType,
      limit,
      page
    };

    const result = await this.productsService.findAll(filters);
    return {
      success: true,
      message: `Productos de tipo "${productType}" obtenidos exitosamente`,
      ...result,
    };
  }

  // ✅ NUEVO: Obtener todos los tipos de producto disponibles
  @Get('types/list')
  async getAvailableProductTypes() {
    const types = await this.productsService.getAvailableProductTypes();
    return {
      success: true,
      message: 'Tipos de producto disponibles obtenidos exitosamente',
      data: types,
    };
  }
}
