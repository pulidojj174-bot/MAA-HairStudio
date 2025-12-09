import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, DataSource } from 'typeorm';
import { Cart } from './cart.entity';
import { CartItem } from './cart-item.entity';
import { ProductsService } from '../products/products.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto, UpdateAction } from './dto/update-cart-item.dto';
import {
  PaginatedCartResponse,
  CartItemResponse,
  CartSummary,
  CartActionResponse,
} from './interfaces/PaginatedCartResponse';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    private readonly productsService: ProductsService,
    private readonly dataSource: DataSource,
  ) {}

  // ✅ OBTENER O CREAR CARRITO DEL USUARIO
  async getOrCreateCart(userId: string): Promise<Cart> {
    try {
      this.logger.debug(`📦 Obteniendo carrito para usuario: ${userId}`);
      
      // PASO 1: Buscar carrito base SIN relaciones
      let cart = await this.cartRepository.findOne({
        where: { userId },
      });

      // PASO 2: Si no existe, crear uno
      if (!cart) {
        this.logger.debug(`📦 Creando nuevo carrito para usuario ${userId}`);
        cart = this.cartRepository.create({
          userId,
          status: 'active',
          totalAmount: 0,
          totalItems: 0,
          lastActivityAt: new Date(),
        });
        cart = await this.cartRepository.save(cart);
        cart.items = [];
        return cart;
      }

      // PASO 3: Actualizar a active si es necesario
      if (cart.status !== 'active') {
        await this.cartRepository.update(cart.id, {
          status: 'active',
          lastActivityAt: new Date(),
        });
      }

      // PASO 4: CRÍTICO - Cargar items SOLO si existen, usando QueryBuilder
      const cartWithItems = await this.cartRepository
        .createQueryBuilder('cart')
        .where('cart.id = :cartId', { cartId: cart.id })
        .leftJoinAndSelect('cart.items', 'items')
        .leftJoinAndSelect('items.product', 'product')
        .leftJoinAndSelect('product.subcategory', 'subcategory')
        .getOne();

      if (cartWithItems?.items) {
        cart.items = cartWithItems.items;
      } else {
        cart.items = [];
      }

      this.logger.debug(`📦 Carrito obtenido: ID=${cart.id}, Items=${cart.items.length}`);
      return cart;

    } catch (error) {
      this.logger.error(`Error al obtener carrito: ${error.message}`);
      throw new BadRequestException('Error al acceder al carrito');
    }
  }

  // ✅ OBTENER CARRITO CON PAGINACIÓN
  async getCart(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedCartResponse> {
    try {
      const cart = await this.getOrCreateCart(userId);

      // Validar paginación
      const validatedPage = Math.max(1, page);
      const validatedLimit = Math.min(50, Math.max(1, limit));
      const skip = (validatedPage - 1) * validatedLimit;

      // Obtener items con paginación
      const [items, total] = await this.cartItemRepository.findAndCount({
        where: { cartId: cart.id },
        relations: ['product', 'product.subcategory'],
        order: { createdAt: 'DESC' },
        skip,
        take: validatedLimit,
      });

      // Verificar disponibilidad de productos
      const cartItems = await Promise.all(
        items.map(async (item) => await this.buildCartItemResponse(item)),
      );

      // Calcular resumen
      const summary = await this.calculateCartSummary(cart.id);

      // Actualizar totales del carrito
      await this.updateCartTotals(cart.id, summary);

      return {
        success: true,
        message: 'Carrito obtenido exitosamente',
        data: cartItems,
        summary,
        meta: {
          total,
          page: validatedPage,
          limit: validatedLimit,
          totalPages: Math.ceil(total / validatedLimit),
          hasNextPage: validatedPage < Math.ceil(total / validatedLimit),
          hasPrevPage: validatedPage > 1,
        },
        cart: {
          id: cart.id,
          status: cart.status,
          createdAt: cart.createdAt,
          updatedAt: cart.updatedAt,
          lastActivityAt: cart.lastActivityAt,
        },
      };
    } catch (error) {
      this.logger.error(`Error al obtener carrito del usuario ${userId}:`, error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Error al obtener el carrito');
    }
  }

  // ✅ AGREGAR PRODUCTO AL CARRITO
  async addToCart(
    userId: string,
    addToCartDto: AddToCartDto,
  ): Promise<CartActionResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { productId, quantity, note } = addToCartDto;

      // Verificar que el producto existe y está disponible
      await this.productsService.findOneInternal(productId);

      // Verificar disponibilidad de stock
      const availability = await this.productsService.checkAvailability(
        productId,
        quantity,
      );
      if (!availability.available) {
        throw new BadRequestException(availability.message);
      }

      // Obtener o crear carrito
      const cart = await this.getOrCreateCart(userId);

      // Verificar si el producto ya está en el carrito
      let cartItem = await queryRunner.manager.findOne(CartItem, {
        where: { cartId: cart.id, productId },
        relations: ['product'],
      });

      let action: 'added' | 'updated';
      let previousQuantity = 0;
      let newQuantity = quantity;

      if (cartItem) {
        // Producto ya existe, actualizar cantidad
        previousQuantity = cartItem.quantity;
        newQuantity = cartItem.quantity + quantity;

        // Verificar disponibilidad con la nueva cantidad
        const newAvailability = await this.productsService.checkAvailability(
          productId,
          newQuantity,
        );
        if (!newAvailability.available) {
          throw new BadRequestException(newAvailability.message);
        }

        cartItem.quantity = newQuantity;
        cartItem.lastModifiedAt = new Date();
        if (note) cartItem.note = note;

        await queryRunner.manager.save(cartItem);
        action = 'updated';

        this.logger.log(
          `Cantidad actualizada en carrito ${cart.id} para producto ${productId}: ${previousQuantity} -> ${newQuantity}`,
        );
      } else {
        // Producto nuevo, crear item
        const product = await this.productsService.findOneInternal(productId);

        cartItem = queryRunner.manager.create(CartItem, {
          cartId: cart.id,
          productId,
          quantity,
          unitPrice: product.finalPrice || product.price,
          originalPrice: product.originalPrice || product.price,
          discountPercentage: product.discountPercentage || 0,
          note,
          lastModifiedAt: new Date(),
        });

        await queryRunner.manager.save(cartItem);
        action = 'added';

        this.logger.log(
          `Producto ${productId} agregado al carrito ${cart.id} con cantidad ${quantity}`,
        );
      }

      // Actualizar actividad del carrito
      await queryRunner.manager.update(Cart, cart.id, {
        lastActivityAt: new Date(),
      });

      await queryRunner.commitTransaction();

      // Obtener carrito actualizado
      const updatedCart = await this.getCart(userId);

      return {
        success: true,
        message:
          action === 'added'
            ? 'Producto agregado al carrito'
            : 'Cantidad actualizada en el carrito',
        action,
        affectedItem: {
          productId,
          productName: cartItem.product?.name || 'Producto',
          previousQuantity: action === 'updated' ? previousQuantity : undefined,
          newQuantity,
        },
        cart: updatedCart,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error al agregar producto ${addToCartDto.productId} al carrito del usuario ${userId}:`,
        error,
      );

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al agregar producto al carrito');
    } finally {
      await queryRunner.release();
    }
  }

  // ✅ ACTUALIZAR ITEM DEL CARRITO
  async updateCartItem(
    userId: string,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<CartActionResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { productId, quantity, action = UpdateAction.SET, note } =
        updateCartItemDto;

      const cart = await this.getOrCreateCart(userId);

      const cartItem = await queryRunner.manager.findOne(CartItem, {
        where: { cartId: cart.id, productId },
        relations: ['product'],
      });

      if (!cartItem) {
        throw new NotFoundException('Producto no encontrado en el carrito');
      }

      const previousQuantity = cartItem.quantity;
      let newQuantity: number;

      // Calcular nueva cantidad según la acción
      switch (action) {
        case UpdateAction.SET:
          newQuantity = quantity;
          break;
        case UpdateAction.INCREMENT:
          newQuantity = cartItem.quantity + quantity;
          break;
        case UpdateAction.DECREMENT:
          newQuantity = Math.max(0, cartItem.quantity - quantity);
          break;
        default:
          throw new BadRequestException('Acción no válida');
      }

      let actionResult: 'updated' | 'removed';

      if (newQuantity === 0) {
        // Eliminar item del carrito
        await queryRunner.manager.remove(cartItem);
        actionResult = 'removed';
        this.logger.log(`Producto ${productId} eliminado del carrito ${cart.id}`);
      } else {
        // Verificar disponibilidad
        const availability = await this.productsService.checkAvailability(
          productId,
          newQuantity,
        );
        if (!availability.available) {
          throw new BadRequestException(availability.message);
        }

        // Actualizar item
        cartItem.quantity = newQuantity;
        cartItem.lastModifiedAt = new Date();
        if (note !== undefined) cartItem.note = note;

        await queryRunner.manager.save(cartItem);
        actionResult = 'updated';
        this.logger.log(
          `Cantidad actualizada en carrito ${cart.id} para producto ${productId}: ${previousQuantity} -> ${newQuantity}`,
        );
      }

      // Actualizar actividad del carrito
      await queryRunner.manager.update(Cart, cart.id, {
        lastActivityAt: new Date(),
      });

      await queryRunner.commitTransaction();

      const updatedCart = await this.getCart(userId);

      return {
        success: true,
        message:
          actionResult === 'removed'
            ? 'Producto eliminado del carrito'
            : 'Producto actualizado en el carrito',
        action: actionResult,
        affectedItem: {
          productId,
          productName: cartItem.product?.name || 'Producto',
          previousQuantity,
          newQuantity,
        },
        cart: updatedCart,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error al actualizar item ${updateCartItemDto.productId} del carrito del usuario ${userId}:`,
        error,
      );

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al actualizar producto del carrito');
    } finally {
      await queryRunner.release();
    }
  }

  // ✅ ELIMINAR PRODUCTO DEL CARRITO
  async removeFromCart(userId: string, productId: string): Promise<CartActionResponse> {
    return await this.updateCartItem(userId, {
      productId,
      quantity: 0,
      action: UpdateAction.SET,
    });
  }

  // ✅ LIMPIAR CARRITO COMPLETO
  async clearCart(userId: string): Promise<CartActionResponse> {
    try {
      const cart = await this.getOrCreateCart(userId);

      const deletedCount = await this.cartItemRepository.delete({ cartId: cart.id });

      // Actualizar totales del carrito
      await this.cartRepository.update(cart.id, {
        totalAmount: 0,
        totalItems: 0,
        lastActivityAt: new Date(),
      });

      this.logger.log(
        `Carrito ${cart.id} limpiado. ${deletedCount.affected || 0} items eliminados.`,
      );

      const updatedCart = await this.getCart(userId);

      return {
        success: true,
        message: 'Carrito limpiado exitosamente',
        action: 'cleared',
        cart: updatedCart,
      };
    } catch (error) {
      this.logger.error(`Error al limpiar carrito del usuario ${userId}:`, error);
      throw new BadRequestException('Error al limpiar el carrito');
    }
  }

  // ✅ OBTENER RESUMEN DEL CARRITO
  async getCartSummary(userId: string): Promise<CartSummary> {
    try {
      const cart = await this.getOrCreateCart(userId);
      return await this.calculateCartSummary(cart.id);
    } catch (error) {
      this.logger.error(
        `Error al obtener resumen del carrito del usuario ${userId}:`,
        error,
      );
      throw new BadRequestException('Error al obtener resumen del carrito');
    }
  }

  // ✅ VERIFICAR DISPONIBILIDAD DE TODOS LOS ITEMS
  async validateCartAvailability(userId: string) {
    try {
      const cart = await this.getOrCreateCart(userId);

      const items = await this.cartItemRepository.find({
        where: { cartId: cart.id },
        relations: ['product'],
      });

      const validationResults = await Promise.all(
        items.map(async (item) => {
          const availability = await this.productsService.checkAvailability(
            item.productId,
            item.quantity,
          );

          return {
            itemId: item.id,
            productId: item.productId,
            productName: item.product.name,
            requestedQuantity: item.quantity,
            ...availability,
          };
        }),
      );

      const unavailableItems = validationResults.filter(
        (result) => !result.available,
      );

      return {
        success: true,
        message: 'Validación de disponibilidad completada',
        data: {
          totalItems: validationResults.length,
          availableItems: validationResults.length - unavailableItems.length,
          unavailableItems: unavailableItems.length,
          details: validationResults,
          hasUnavailableItems: unavailableItems.length > 0,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error al validar disponibilidad del carrito del usuario ${userId}:`,
        error,
      );
      throw new BadRequestException('Error al validar disponibilidad del carrito');
    }
  }

  // ✅ MÉTODOS PRIVADOS AUXILIARES

  private async buildCartItemResponse(item: CartItem): Promise<CartItemResponse> {
    // Verificar disponibilidad actual del producto
    let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'unlimited' =
      'in_stock';

    try {
      const availability = await this.productsService.checkAvailability(
        item.productId,
        item.quantity,
      );
      if (!availability.available) {
        stockStatus = 'out_of_stock';
      } else if (
        item.product.trackInventory &&
        item.product.stock <= item.product.minStock
      ) {
        stockStatus = 'low_stock';
      } else if (!item.product.trackInventory) {
        stockStatus = 'unlimited';
      }
    } catch (error) {
      this.logger.warn(
        `Error al verificar disponibilidad del producto ${item.productId}:`,
        error,
      );
      stockStatus = 'out_of_stock';
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
      },
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      originalPrice: item.originalPrice,
      subtotal: item.subtotal / 1.21,
      totalDiscount: item.totalDiscount,
      isOnSale: item.isOnSale,
      note: item.note,
      addedAt: item.createdAt,
      lastModifiedAt: item.lastModifiedAt,
    };
  }

  private async calculateCartSummary(cartId: string): Promise<CartSummary> {
    const items = await this.cartItemRepository.find({
      where: { cartId },
      relations: ['product'],
    });

    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.subtotal /1.21, 0);
    const totalDiscount = items.reduce((sum, item) => sum + item.totalDiscount, 0);
    // Calcular impuestos estimados (19% en Colombia)
    const estimatedTax = Number((subtotal * 0.21).toFixed(2));
    
    const totalAmount = subtotal + estimatedTax - totalDiscount;

    // Calcular envío estimado (gratis si es mayor a $100,000)
    const estimatedShipping = totalAmount >= 100000 ? 0 : 0;

    const estimatedTotal = Number((totalAmount + estimatedShipping).toFixed(2));

    return {
      totalItems,
      totalQuantity,
      subtotal: Number(subtotal.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
      estimatedTax,
      estimatedShipping,
      estimatedTotal,
    };
  }

  private async updateCartTotals(cartId: string, summary: CartSummary): Promise<void> {
    await this.cartRepository.update(cartId, {
      totalAmount: summary.totalAmount,
      totalItems: summary.totalItems,
    });
  }
}
