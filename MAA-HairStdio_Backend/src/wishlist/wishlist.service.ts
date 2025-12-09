import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, DataSource } from 'typeorm';
import { Wishlist } from './wishlist.entity';
import { ProductsService } from '../products/products.service';
import { CartService } from '../cart/cart.service';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';
import { MoveToCartDto } from './dto/move-to-cart.dto';
import {
  PaginatedWishlistResponse,
  WishlistItemResponse,
  WishlistSummary,
  WishlistActionResponse,
} from './interfaces/wishlist-response.interface';

@Injectable()
export class WishlistService {
  private readonly logger = new Logger(WishlistService.name);

  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    private readonly productsService: ProductsService,
    private readonly cartService: CartService,
    private readonly dataSource: DataSource,
  ) {}

  // ✅ OBTENER WISHLIST CON PAGINACIÓN Y ANÁLISIS
  async getWishlist(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedWishlistResponse> {
    try {
      // Validar paginación
      const validatedPage = Math.max(1, page);
      const validatedLimit = Math.min(50, Math.max(1, limit));
      const skip = (validatedPage - 1) * validatedLimit;

      // Obtener items con paginación
      const [items, total] = await this.wishlistRepository.findAndCount({
        where: { userId, isActive: true },
        relations: ['product', 'product.subcategory'],
        order: { createdAt: 'DESC' },
        skip,
        take: validatedLimit,
      });

      // Construir respuestas con análisis de precio y disponibilidad
      const wishlistItems = await Promise.all(
        items.map(async (item) => await this.buildWishlistItemResponse(item)),
      );

      // Calcular resumen
      const summary = await this.calculateWishlistSummary(items);

      return {
        success: true,
        message: 'Wishlist obtenida exitosamente',
        data: wishlistItems,
        summary,
        meta: {
          total,
          page: validatedPage,
          limit: validatedLimit,
          totalPages: Math.ceil(total / validatedLimit),
          hasNextPage: validatedPage < Math.ceil(total / validatedLimit),
          hasPrevPage: validatedPage > 1,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener wishlist del usuario ${userId}:`,
        error,
      );
      throw new BadRequestException('Error al obtener la wishlist');
    }
  }

  // ✅ AGREGAR PRODUCTO A LA WISHLIST - CORREGIDO
  async addToWishlist(
    userId: string,
    addToWishlistDto: AddToWishlistDto,
  ): Promise<WishlistActionResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { productId, note, visibility = 'private' } = addToWishlistDto;

      // Verificar que el producto existe y está activo
      const product = await this.productsService.findOneInternal(productId);

      if (!product.isActive) {
        throw new BadRequestException(
          'No se puede agregar un producto inactivo a la wishlist',
        );
      }

      // ✅ CORREGIDO: Buscar producto tanto activo como inactivo
      const existingItem = await queryRunner.manager.findOne(Wishlist, {
        where: { userId, productId }, // ← QUITAR isActive: true de aquí
      });

      if (existingItem?.isActive) {
        // Si ya está activo, lanzar conflicto
        throw new ConflictException('El producto ya está en tu wishlist');
      }

      let savedItem: Wishlist;

      if (existingItem && !existingItem.isActive) {
        // ✅ REACTIVAR producto existente pero inactivo
        existingItem.note = note || '';
        existingItem.visibility = visibility;
        existingItem.priceWhenAdded = product.finalPrice || product.price;
        existingItem.viewCount = 0;
        existingItem.isActive = true;
        existingItem.lastViewedAt = new Date();
        existingItem.updatedAt = new Date();

        savedItem = await queryRunner.manager.save(existingItem);

        this.logger.log(
          `Producto ${productId} reactivado en la wishlist del usuario ${userId}`,
        );
      } else {
        // ✅ CREAR nuevo item si no existe
        const wishlistItem = queryRunner.manager.create(Wishlist, {
          userId,
          productId,
          note,
          visibility,
          priceWhenAdded: product.finalPrice || product.price,
          viewCount: 0,
          isActive: true,
        });

        savedItem = await queryRunner.manager.save(wishlistItem);

        this.logger.log(
          `Producto ${productId} agregado a la wishlist del usuario ${userId}`,
        );
      }

      await queryRunner.commitTransaction();

      // Obtener wishlist actualizada
      const updatedWishlist = await this.getWishlist(userId);

      return {
        success: true,
        message: existingItem && !existingItem.isActive 
          ? 'Producto reagregado a la wishlist exitosamente'
          : 'Producto agregado a la wishlist exitosamente',
        action: 'added',
        affectedItem: {
          productId,
          productName: product.name,
        },
        wishlist: updatedWishlist,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error al agregar producto ${addToWishlistDto.productId} a la wishlist del usuario ${userId}:`,
        error,
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new BadRequestException('Error al agregar producto a la wishlist');
    } finally {
      await queryRunner.release();
    }
  }

  // ✅ ELIMINAR PRODUCTO DE LA WISHLIST
  async removeFromWishlist(
    userId: string,
    productId: string,
  ): Promise<WishlistActionResponse> {
    try {
      const wishlistItem = await this.wishlistRepository.findOne({
        where: { userId, productId, isActive: true },
        relations: ['product'],
      });

      if (!wishlistItem) {
        throw new NotFoundException('Producto no encontrado en la wishlist');
      }

      // Soft delete
      await this.wishlistRepository.update(wishlistItem.id, {
        isActive: false,
      });

      this.logger.log(
        `Producto ${productId} eliminado de la wishlist del usuario ${userId}`,
      );

      const updatedWishlist = await this.getWishlist(userId);

      return {
        success: true,
        message: 'Producto eliminado de la wishlist exitosamente',
        action: 'removed',
        affectedItem: {
          productId,
          productName: wishlistItem.product?.name || 'Producto',
        },
        wishlist: updatedWishlist,
      };
    } catch (error) {
      this.logger.error(
        `Error al eliminar producto ${productId} de la wishlist del usuario ${userId}:`,
        error,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al eliminar producto de la wishlist');
    }
  }

  // ✅ MOVER PRODUCTO DE WISHLIST AL CARRITO
  async moveToCart(
    userId: string,
    moveToCartDto: MoveToCartDto,
  ): Promise<WishlistActionResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { productId, quantity = 1, removeFromWishlist = true, note } =
        moveToCartDto;

      // Verificar que el producto está en la wishlist
      const wishlistItem = await queryRunner.manager.findOne(Wishlist, {
        where: { userId, productId, isActive: true },
        relations: ['product'],
      });

      if (!wishlistItem) {
        throw new NotFoundException('Producto no encontrado en la wishlist');
      }

      // Agregar al carrito usando el servicio de carrito
      await this.cartService.addToCart(userId, {
        productId,
        quantity,
        note: note || `Movido desde wishlist: ${wishlistItem.note || ''}`.trim(),
      });

      // Eliminar de la wishlist si se solicita
      if (removeFromWishlist) {
        await queryRunner.manager.update(Wishlist, wishlistItem.id, {
          isActive: false,
        });
      }

      this.logger.log(
        `Producto ${productId} movido de wishlist al carrito del usuario ${userId}. ` +
          `Cantidad: ${quantity}. Eliminado de wishlist: ${removeFromWishlist}`,
      );

      await queryRunner.commitTransaction();

      const updatedWishlist = await this.getWishlist(userId);

      return {
        success: true,
        message: removeFromWishlist
          ? 'Producto movido al carrito y eliminado de la wishlist'
          : 'Producto agregado al carrito (mantenido en wishlist)',
        action: 'moved_to_cart',
        affectedItem: {
          productId,
          productName: wishlistItem.product?.name || 'Producto',
        },
        wishlist: updatedWishlist,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error al mover producto ${moveToCartDto.productId} al carrito del usuario ${userId}:`,
        error,
      );

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al mover producto al carrito');
    } finally {
      await queryRunner.release();
    }
  }

  // ✅ LIMPIAR TODA LA WISHLIST
  async clearWishlist(userId: string): Promise<WishlistActionResponse> {
    try {
      const result = await this.wishlistRepository.update(
        { userId, isActive: true },
        { isActive: false },
      );

      this.logger.log(
        `Wishlist limpiada para usuario ${userId}. ${result.affected || 0} items desactivados.`,
      );

      const updatedWishlist = await this.getWishlist(userId);

      return {
        success: true,
        message: 'Wishlist limpiada exitosamente',
        action: 'removed',
        wishlist: updatedWishlist,
      };
    } catch (error) {
      this.logger.error(`Error al limpiar wishlist del usuario ${userId}:`, error);
      throw new BadRequestException('Error al limpiar la wishlist');
    }
  }

  // ✅ VERIFICAR SI UN PRODUCTO ESTÁ EN LA WISHLIST
  async isInWishlist(
    userId: string,
    productId: string,
  ): Promise<{ inWishlist: boolean; itemId?: string }> {
    try {
      const item = await this.wishlistRepository.findOne({
        where: { userId, productId, isActive: true },
        select: ['id'],
      });

      return {
        inWishlist: !!item,
        itemId: item?.id,
      };
    } catch (error) {
      this.logger.error(
        `Error al verificar si producto ${productId} está en wishlist del usuario ${userId}:`,
        error,
      );
      return { inWishlist: false };
    }
  }

  // ✅ OBTENER PRODUCTOS CON CAMBIOS DE PRECIO
  async getItemsWithPriceChanges(userId: string) {
    try {
      const items = await this.wishlistRepository.find({
        where: { userId, isActive: true },
        relations: ['product'],
      });

      const itemsWithChanges: Array<{
        id: string;
        productId: string;
        productName: string;
        originalPrice: number;
        currentPrice: number;
        changeAmount: number;
        changePercentage: number;
        changeType: 'increased' | 'decreased';
        addedAt: Date;
      }> = [];

      for (const item of items) {
        if (!item.product || !item.priceWhenAdded) continue;

        const currentPrice = item.product.finalPrice || item.product.price;
        const originalPrice = item.priceWhenAdded;

        if (currentPrice !== originalPrice) {
          const changeAmount = currentPrice - originalPrice;
          const changePercentage = ( ( changeAmount / originalPrice ) * 100 );

          itemsWithChanges.push({
            id: item.id,
            productId: item.productId,
            productName: item.product.name,
            originalPrice,
            currentPrice,
            changeAmount: Math.abs(changeAmount),
            changePercentage: Math.abs(changePercentage),
            changeType: changeAmount > 0 ? 'increased' : 'decreased',
            addedAt: item.createdAt,
          });
        }
      }

      return {
        success: true,
        message: 'Cambios de precio obtenidos exitosamente',
        data: {
          totalItems: items.length,
          itemsWithChanges: itemsWithChanges.length,
          priceIncreases: itemsWithChanges.filter(
            (item) => item.changeType === 'increased',
          ).length,
          priceDecreases: itemsWithChanges.filter(
            (item) => item.changeType === 'decreased',
          ).length,
          items: itemsWithChanges,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener cambios de precio para usuario ${userId}:`,
        error,
      );
      throw new BadRequestException('Error al obtener cambios de precio');
    }
  }

  // ✅ INCREMENTAR CONTADOR DE VISTAS - CORREGIDO
  async incrementViewCount(userId: string, productId: string): Promise<void> {
    try {
      await this.wishlistRepository.update(
        { userId, productId, isActive: true },
        {
          viewCount: () => '"viewCount" + 1',  // ✅ CORREGIDO: usar "viewCount" con comillas
          lastViewedAt: new Date(),
        },
      );
    } catch (error) {
      this.logger.warn(
        `Error al incrementar vista del producto ${productId} en wishlist del usuario ${userId}:`,
        error,
      );
      // No lanzar error aquí, es una operación secundaria
    }
  }

  // ✅ NUEVO: FUNCIÓN ESPECÍFICA PARA CONTEO DE WISHLIST
  async getWishlistCount(userId: string): Promise<{
    totalItems: number;
    totalValue: number;
    availableItems: number;
    unavailableItems: number;
  }> {
    try {
      // ✅ CONTEO DIRECTO Y PRECISO
      const activeItems = await this.wishlistRepository.find({
        where: { userId, isActive: true },
        relations: ['product'],
        select: ['id', 'productId', 'priceWhenAdded'],
      });

      let totalValue = 0;
      let availableItems = 0;
      let unavailableItems = 0;

      // ✅ CALCULAR MÉTRICAS PRECISAS
      for (const item of activeItems) {
        if (item.product) {
          const price = item.product.finalPrice || item.product.price;
          totalValue += price;

          try {
            const availability = await this.productsService.checkAvailability(
              item.productId,
              1,
            );
            if (availability.available) {
              availableItems++;
            } else {
              unavailableItems++;
            }
          } catch {
            unavailableItems++;
          }
        }
      }

      const result = {
        totalItems: activeItems.length,
        totalValue: Number(totalValue.toFixed(2)),
        availableItems,
        unavailableItems,
      };

      this.logger.debug(
        `Conteo de wishlist para usuario ${userId}: ${JSON.stringify(result)}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Error al contar items de wishlist del usuario ${userId}:`,
        error,
      );
      return {
        totalItems: 0,
        totalValue: 0,
        availableItems: 0,
        unavailableItems: 0,
      };
    }
  }

  // ✅ FUNCIÓN DE DEBUGGING PARA VERIFICAR ESTADOS
  async debugWishlistStates(userId: string): Promise<{
    activeItems: Array<{ id: string; productId: string; isActive: boolean; createdAt: Date; updatedAt: Date }>;
    inactiveItems: Array<{ id: string; productId: string; isActive: boolean; createdAt: Date; updatedAt: Date }>;
    totalActiveCount: number;
    totalInactiveCount: number;
  }> {
    try {
      const allItems = await this.wishlistRepository.find({
        where: { userId },
        select: ['id', 'productId', 'isActive', 'createdAt', 'updatedAt'],
        order: { createdAt: 'DESC' },
      });

      const activeItems = allItems.filter(item => item.isActive);
      const inactiveItems = allItems.filter(item => !item.isActive);

      return {
        activeItems,
        inactiveItems,
        totalActiveCount: activeItems.length,
        totalInactiveCount: inactiveItems.length,
      };
    } catch (error) {
      this.logger.error(
        `Error al debuggear estados de wishlist del usuario ${userId}:`,
        error,
      );
      throw new BadRequestException('Error al obtener estados de wishlist');
    }
  }

  // ✅ MÉTODOS PRIVADOS AUXILIARES

  private async buildWishlistItemResponse(
    item: Wishlist,
  ): Promise<WishlistItemResponse> {
    // Verificar disponibilidad actual
    let availability = {
        isAvailable: false,
        stock: 0,
        message: 'Producto no disponible',
      };
    let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'unlimited' =
      'out_of_stock';

    try {
      const availabilityCheck = await this.productsService.checkAvailability(
        item.productId,
        1,
      );
      availability = {
        isAvailable: availabilityCheck.available,
        stock: availabilityCheck.stock,
        message: availabilityCheck.message || 'Estado de disponibilidad desconocido',
      };

      if (availabilityCheck.available) {
        if (!item.product.trackInventory) {
          stockStatus = 'unlimited';
        } else if (item.product.stock <= (item.product.minStock || 5)) {
          stockStatus = 'low_stock';
        } else {
          stockStatus = 'in_stock';
        }
      }
    } catch (error) {
      this.logger.warn(
        `Error al verificar disponibilidad del producto ${item.productId}:`,
        error,
      );
    }

    // Analizar cambios de precio
    const currentPrice = item.product.finalPrice || item.product.price;
    const priceChange = {
      hasChanged: false,
      currentPrice,
      originalPrice: item.priceWhenAdded || currentPrice,
      changeType: 'same' as 'increased' | 'decreased' | 'same',
      changeAmount: 0,
      changePercentage: 0,
    };

    if (item.priceWhenAdded && item.priceWhenAdded !== currentPrice) {
      const changeAmount = currentPrice - item.priceWhenAdded;
      priceChange.hasChanged = true;
      priceChange.changeAmount = Math.abs(changeAmount);
      priceChange.changePercentage = Math.abs(
        (changeAmount / item.priceWhenAdded) * 100,
      );
      priceChange.changeType = changeAmount > 0 ? 'increased' : 'decreased';
    }

    return {
      id: item.id,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        image: item.product.image,
        images: item.product.images,
        price: item.product.price,
        originalPrice: item.product.originalPrice,
        finalPrice: item.product.finalPrice,
        discountPercentage: item.product.discountPercentage,
        subcategory: item.product.subcategory?.name || '',
        brand: item.product.brand || '',
        volume: item.product.volume,
        isActive: item.product.isActive,
        isAvailable: item.product.isAvailable,
        stock: item.product.stock,
        stockStatus,
        rating: item.product.rating,
        reviewCount: item.product.reviewCount,
      },
      note: item.note,
      priceWhenAdded: item.priceWhenAdded,
      priceChange,
      availability,
      addedAt: item.createdAt,
      lastViewedAt: item.lastViewedAt,
      viewCount: item.viewCount,
    };
  }

  private async calculateWishlistSummary(items: Wishlist[]): Promise<WishlistSummary> {
    let totalValue = 0;
    let totalDiscount = 0;
    let availableItems = 0;
    let unavailableItems = 0;
    let itemsOnSale = 0;

    for (const item of items) {
      if (!item.product) continue;

      const price = item.product.finalPrice || item.product.price;
      totalValue += price;

      if (item.product.discountPercentage > 0) {
        itemsOnSale++;
        const originalPrice = item.product.originalPrice || item.product.price;
        totalDiscount += originalPrice - price;
      }

      try {
        const availability = await this.productsService.checkAvailability(
          item.productId,
          1,
        );
        if (availability.available) {
          availableItems++;
        } else {
          unavailableItems++;
        }
      } catch {
        unavailableItems++;
      }
    }

    const totalItems = items.length;
    const averagePrice = totalItems > 0 ? totalValue / totalItems : 0;

    return {
      totalItems,
      totalValue: Number(totalValue.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      availableItems,
      unavailableItems,
      itemsOnSale,
      averagePrice: Number(averagePrice.toFixed(2)),
    };
  }
}
