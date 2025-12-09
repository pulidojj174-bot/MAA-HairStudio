import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { Order } from './orders.entity';
import { Product } from '../products/product.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  order: Order;

  @ManyToOne(() => Product, { eager: true })
  product: Product;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number; // Precio al momento de la compra

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number; // quantity * unitPrice

  // Snapshot del producto (por si cambia después)
  @Column({ type: 'varchar', length: 255 })
  productName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  productBrand?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  productTypeHair?: string; // Específico para peluquería

  @Column({ type: 'varchar', length: 255, nullable: true })
  productDesiredResult?: string; // Específico para peluquería

  @Column({ type: 'text', nullable: true })
  productImage?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  productVolume?: string;
}