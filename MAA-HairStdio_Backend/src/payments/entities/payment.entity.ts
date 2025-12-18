import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
} from 'typeorm';
import { Order } from '../../orders/orders.entity';
import { User } from '../../users/user.entity';
import { PaymentTransaction } from './payment-transaction.entity';

export enum PaymentMethodEnum {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  WALLET = 'wallet',
  OTHER = 'other',
}

@Entity('payments')
@Index('idx_payments_order_id', ['order'])
@Index('idx_payments_user_id', ['user'])
@Index('idx_payments_status', ['status'])
@Index('idx_payments_mercado_pago_id', ['mercadoPagoPaymentId'])
@Index('idx_payments_created_at', ['createdAt'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // ✅ INFORMACIÓN DE MERCADO PAGO
  @Column({ type: 'varchar', length: 255, unique: true })
  mercadoPagoPaymentId: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  idempotencyKey: string;

  // ✅ INFORMACIÓN DEL PAGO
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10 })
  currency: string; // ARS, USD, etc.

  @Column({
    type: 'enum',
    enum: PaymentMethodEnum,
    default: PaymentMethodEnum.OTHER,
  })
  paymentMethod: PaymentMethodEnum;

  // ✅ ESTADO DEL PAGO
  @Column({ type: 'varchar', length: 50 })
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded' | 'in_process';

  @Column({ type: 'varchar', length: 255, nullable: true })
  statusDetail: string; // Detalle del estado (ej: "cc_rejected_insufficient_funds")

  // ✅ REINTENTOS
  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastRetryAt: Date;

  // ✅ INFORMACIÓN DE RECHAZO
  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  failureCode: string;

  // ✅ INFORMACIÓN ADICIONAL
  @Column({ type: 'json', nullable: true })
  mercadoPagoMetadata: Record<string, any>; // Datos adicionales de MP

  @Column({ type: 'text', nullable: true })
  notes: string;

  // ✅ WEBHOOK TRACKING
  @Column({ type: 'timestamptz', nullable: true })
  webhookReceivedAt: Date;

  @Column({ type: 'boolean', default: false })
  webhookProcessed: boolean;

  // ✅ OPERACIONES FINANCIERAS
  @OneToMany(() => PaymentTransaction, (transaction) => transaction.payment, {
    cascade: true,
  })
  transactions: PaymentTransaction[];

  // ✅ AUDITORÍA
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string; // ID del webhook que procesó

  @Column({ type: 'timestamptz', nullable: true })
  refundedAt: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  refundedAmount: number;
}