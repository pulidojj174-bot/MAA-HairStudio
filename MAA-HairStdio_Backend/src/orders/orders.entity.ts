import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Address } from '../address/address.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'pending',
  AWAITING_SHIPPING_COST = 'awaiting_shipping_cost',
  SHIPPING_COST_SET = 'shipping_cost_set',
  CONFIRMED = 'confirmed',
  PAID = 'paid',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export enum PaymentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum DeliveryType {
  PICKUP = 'pickup',
  DELIVERY = 'delivery'
}

@Entity('orders')
@Index('idx_orders_user_id', ['user'])
@Index('idx_orders_status', ['status'])
@Index('idx_orders_delivery_type', ['deliveryType'])
@Index('idx_orders_created_at', ['createdAt'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  orderNumber: string;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true, eager: true })
  items: OrderItem[];

  // ✅ INFORMACIÓN DE ENTREGA
  @Column({ 
    type: 'enum', 
    enum: DeliveryType,
    default: DeliveryType.PICKUP 
  })
  deliveryType: DeliveryType;

  @ManyToOne(() => Address, { eager: true, nullable: true })
  shippingAddress?: Address;

  @Column({ type: 'json', nullable: true })
  shippingSnapshot?: {
    recipientName: string;
    phone: string;
    fullAddress: string;
    province: string;
    city: string;
    postalCode: string;
    deliveryInstructions?: string;
  };

  // ✅ INFORMACIÓN DE COSTOS
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shippingCost: number;

  @Column({ type: 'boolean', default: false })
  isShippingCostSet: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  // ✅ ESTADOS Y CONTROL
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  // ✅ GESTIÓN DE COSTOS DE ENVÍO
  @Column({ type: 'uuid', nullable: true })
  shippingCostSetBy?: string;

  @Column({ type: 'timestamptz', nullable: true })
  shippingCostSetAt?: Date;

  @Column({ type: 'text', nullable: true })
  shippingNotes?: string;

  @Column({ type: 'timestamptz', nullable: true })
  customerNotifiedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  customerConfirmedAt?: Date;

  // ✅ INFORMACIÓN DE PAGO (MercadoPago)
  @Column({ type: 'varchar', length: 255, nullable: true })
  mercadoPagoId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mercadoPagoPaymentId?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentMethod?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // ✅ MÉTODOS COMPUTED
  get requiresShippingCost(): boolean {
    return this.deliveryType === DeliveryType.DELIVERY && !this.isShippingCostSet;
  }

  get isReadyForPayment(): boolean {
    return this.deliveryType === DeliveryType.PICKUP || 
           (this.deliveryType === DeliveryType.DELIVERY && this.isShippingCostSet);
  }

  get statusDescription(): string {
    switch (this.status) {
      case OrderStatus.AWAITING_SHIPPING_COST:
        return 'Esperando cotización de envío por parte de MAA Hair Studio';
      case OrderStatus.SHIPPING_COST_SET:
        return 'Costo de envío establecido, esperando tu confirmación';
      case OrderStatus.CONFIRMED:
        return 'Orden confirmada, puedes proceder con el pago';
      default:
        return this.status;
    }
  }
}