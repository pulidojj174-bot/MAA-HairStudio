import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  BeforeInsert,
  BeforeUpdate,
  JoinColumn,
  Check,
} from 'typeorm';
import { Subcategory } from '../subcategories/subcategory.entity';
import { Address } from '../address/address.entity';

// ✅ NUEVO ENUM para tipos de producto
export enum ProductType {
  SHAMPOO = 'Shampoo',
  ACONDICIONADOR = 'Acondicionador',
  MASCARILLA = 'Mascarilla',
  SERUM = 'Serum',
  ACEITE = 'Aceite',
  SPRAY = 'Spray',
  CREMA = 'Crema',
  GEL = 'Gel',
  MOUSSE = 'Mousse',
  CERA = 'Cera',
  POMADA = 'Pomada',
  TRATAMIENTO = 'Tratamiento',
  TINTE = 'Tinte',
  DECOLORANTE = 'Decolorante',
  PROTECTOR_TERMICO = 'Protector Térmico',
  LEAVE_IN = 'Leave-in',
  AMPOLLA = 'Ampolla',
  TONICO = 'Tónico',
  EXFOLIANTE = 'Exfoliante',
  OLEO = 'Oleo',
}

// ✅ Enums existentes
export enum HairType {
  GRASO = 'Graso',
  SECO = 'Seco',
  MIXTO = 'Mixto',
  RIZADO = 'Rizado',
  LISO = 'Liso',
  ONDULADO = 'Ondulado',
  TEÑIDO = 'Teñido',
  DAÑADO = 'Dañado',
  FINO = 'Fino',
}

export enum DesiredResult {
  HIDRATACION = 'Hidratación',
  VOLUMEN = 'Volumen',
  ANTI_CASPA = 'Anti-caspa',
  REPARACION = 'Reparación',
  BRILLO = 'Brillo',
  CONTROL_GRASA = 'Control de grasa',
  CRECIMIENTO = 'Crecimiento',
  COLOR_PROTECT = 'Protección del color',
  DEFINICIÓN = 'Definición',
  ANTIRRITACIÓN = 'Antirritación',
  ANTICAIDA = 'Anti-caída',
}

@Entity('products')
// ✅ Agregar índice para type_product
@Index('idx_products_name_active', ['name', 'isActive'])
@Index('idx_products_price_active', ['price', 'isActive'])
@Index('idx_products_brand_active', ['brand', 'isActive'])
@Index('idx_products_featured_active', ['isFeatured', 'isActive'])
@Index('idx_products_collection_active', ['collection', 'isActive'])
@Index('idx_products_type_product_active', ['type_product', 'isActive']) // ← NUEVO ÍNDICE
// ✅ Constraints de validación
@Check('chk_products_price_positive', 'price > 0')
@Check('chk_products_stock_non_negative', 'stock >= 0')
@Check('chk_products_rating_range', 'rating >= 0 AND rating <= 5')
@Check('chk_products_discount_range', 'discount_percentage >= 0 AND discount_percentage <= 100')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ✅ INFORMACIÓN BÁSICA
  @Column({ type: 'varchar', length: 255 })
  @Index('idx_products_name')
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index('idx_products_slug')
  slug: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  shortDescription?: string;

  // ✅ CAMPOS ESPECÍFICOS DE PELUQUERÍA con Enums
  @Column({
    type: 'enum',
    enum: HairType,
    nullable: true
  })
  @Index('idx_products_type_hair')
  type_hair?: HairType;

  @Column({
    type: 'enum',
    enum: DesiredResult,
    nullable: true
  })
  @Index('idx_products_desired_result')
  desired_result?: DesiredResult;

  // ✅ NUEVO CAMPO: TYPE_PRODUCT
  @Column({
    type: 'enum',
    enum: ProductType,
    nullable: true
  })
  @Index('idx_products_type_product')
  type_product?: ProductType;

  // ✅ PRICING mejorado
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value)
    }
  })
  @Index('idx_products_price')
  price: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => value ? parseFloat(value) : null
    }
  })
  originalPrice?: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    name: 'discount_percentage'
  })
  discountPercentage: number;

  // ✅ INVENTARIO mejorado
  @Column({ type: 'int', default: 0 })
  @Index('idx_products_stock')
  stock: number;

  @Column({ type: 'int', default: 5 })
  minStock: number;

  @Column({ type: 'boolean', default: true })
  trackInventory: boolean;

  // ✅ RELACIÓN con foreign key explícita
  @ManyToOne(() => Subcategory, (subcategory) => subcategory.products, {
    eager: true,
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  })
  @JoinColumn({
    name: 'subcategory_id',
    foreignKeyConstraintName: 'fk_products_subcategory'
  })
  subcategory: Subcategory;

  @Column({ type: 'uuid', name: 'subcategory_id' })
  @Index('idx_products_subcategory_id')
  subcategoryId: string;

  // ✅ MULTIMEDIA
  @Column({ type: 'text' })
  image: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    default: () => "'[]'"
  })
  images?: string[];

  @Column({ type: 'varchar', length: 500, nullable: true })
  videoUrl?: string;

  // ✅ DETALLES DEL PRODUCTO
  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index('idx_products_brand')
  brand?: string;

  // ✅ NUEVO CAMPO: COLLECTION
  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index('idx_products_collection')
  collection?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  volume?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, unique: true })
  @Index('idx_products_sku')
  sku?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  barcode?: string;

  // ✅ RATING Y REVIEWS
  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value)
    }
  })
  @Index('idx_products_rating')
  rating: number;

  @Column({ type: 'int', default: 0 })
  reviewCount: number;

  // ✅ ESTADOS Y FLAGS
  @Column({ type: 'boolean', default: true })
  @Index('idx_products_is_active')
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  @Index('idx_products_is_featured')
  isFeatured: boolean;

  @Column({ type: 'boolean', default: true })
  isAvailable: boolean;

  @Column({ type: 'boolean', default: false })
  isDiscontinued: boolean;

  // ✅ SEO
  @Column({ type: 'varchar', length: 160, nullable: true })
  metaDescription?: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    default: () => "'[]'"
  })
  @Index('idx_products_tags')
  tags?: string[];

  // ✅ ANALYTICS
  @Column({ type: 'int', default: 0 })
  @Index('idx_products_view_count')
  viewCount: number;

  @Column({ type: 'int', default: 0 })
  purchaseCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastPurchaseAt?: Date;

  // ✅ TIMESTAMPS
  @CreateDateColumn({ type: 'timestamptz' })
  @Index('idx_products_created_at')
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // ✅ HOOKS para auto-generar campos
  @BeforeInsert()
  @BeforeUpdate()
  validateAndProcess() {
    // Auto-generar slug
    if (this.name && !this.slug) {
      this.slug = this.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }

    // Calcular descuento automático
    if (this.originalPrice && this.originalPrice > this.price) {
      this.discountPercentage = Number(
        (((this.originalPrice - this.price) / this.originalPrice) * 100).toFixed(2)
      );
    } else {
      this.discountPercentage = 0;
    }

    // Auto-gestión de disponibilidad
    if (this.trackInventory && this.stock <= 0) {
      this.isAvailable = false;
    }

    // Auto-generar SKU
    if (!this.sku && this.brand && this.name) {
      const brandCode = this.brand.substring(0, 3).toUpperCase();
      const nameCode = this.name.substring(0, 3).toUpperCase();
      const timestamp = Date.now().toString().slice(-6);
      this.sku = `${brandCode}-${nameCode}-${timestamp}`;
    }
  }

  // ✅ COMPUTED PROPERTIES
  get isOnSale(): boolean {
    return this.discountPercentage > 0 && this.isActive && this.isAvailable;
  }

  get finalPrice(): number {
    if (this.discountPercentage > 0) {
      return Number((this.price * (1 - this.discountPercentage / 100)).toFixed(2));
    }
    return this.price;
  }

  get stockStatus(): 'in_stock' | 'low_stock' | 'out_of_stock' | 'unlimited' {
    if (!this.trackInventory) return 'unlimited';
    if (this.stock <= 0) return 'out_of_stock';
    if (this.stock <= this.minStock) return 'low_stock';
    return 'in_stock';
  }

  get popularity(): number {
    const views = this.viewCount || 0;
    const purchases = this.purchaseCount || 0;
    const rating = this.rating || 0;
    const reviews = this.reviewCount || 0;

    return (views * 0.1) + (purchases * 2) + (rating * reviews * 0.5);
  }
}
