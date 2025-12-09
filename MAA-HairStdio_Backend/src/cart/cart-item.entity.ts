import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
  Check,
} from 'typeorm';
import { Cart } from './cart.entity';
import { Product } from '../products/product.entity';

@Entity('cart_items')
@Index('idx_cart_items_cart_product', ['cartId', 'productId'], { unique: true }) // ✅ Un producto por carrito
@Index('idx_cart_items_cart_id', ['cartId'])
@Index('idx_cart_items_product_id', ['productId'])
@Check('chk_cart_items_quantity_positive', 'quantity > 0') // ✅ Quantity debe ser positiva
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Cart, (cart) => cart.items, { 
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  })
  @JoinColumn({ 
    name: 'cart_id',
    foreignKeyConstraintName: 'fk_cart_items_cart'
  })
  cart: Cart;

  @Column({ type: 'uuid', name: 'cart_id' })
  cartId: string;

  @ManyToOne(() => Product, { 
    eager: true, 
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  })
  @JoinColumn({ 
    name: 'product_id',
    foreignKeyConstraintName: 'fk_cart_items_product'
  })
  product: Product;

  @Column({ type: 'uuid', name: 'product_id' })
  productId: string;

  @Column({ type: 'int' })
  quantity: number;

  // ✅ CAMPOS ADICIONALES ÚTILES
  @Column({ 
    type: 'decimal', 
    precision: 10, 
    scale: 2,
    comment: 'Precio del producto al momento de agregarlo al carrito'
  })
  unitPrice: number;

  @Column({ type: 'text', nullable: true })
  note?: string;

// Add the note property here

  @Column({ 
    type: 'decimal', 
    precision: 10, 
    scale: 2,
    comment: 'Precio original sin descuentos'
  })
  originalPrice: number;

  @Column({ 
    type: 'decimal', 
    precision: 5, 
    scale: 2, 
    default: 0,
    comment: 'Porcentaje de descuento aplicado'
  })
  discountPercentage: number;

  // ✅ METADATOS
  @Column({ type: 'timestamptz', nullable: true })
  lastModifiedAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // ✅ HOOKS para auto-calcular precios
  @BeforeInsert()
  @BeforeUpdate()
  calculatePrices() {
    if (this.product) {
      this.unitPrice = this.product.finalPrice || this.product.price;
      this.originalPrice = this.product.originalPrice || this.product.price;
      this.discountPercentage = this.product.discountPercentage || 0;
      this.lastModifiedAt = new Date();
    }
  }

  // ✅ COMPUTED PROPERTIES
  get subtotal(): number {
    return Number((this.unitPrice * this.quantity).toFixed(2));
  }

  get totalDiscount(): number {
    if (!this.discountPercentage) return 0;
    return Number(((this.originalPrice - this.unitPrice) * this.quantity).toFixed(2));
  }

  get isOnSale(): boolean {
    return this.discountPercentage > 0;
  }
}
