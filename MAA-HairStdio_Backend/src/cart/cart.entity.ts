import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Column,
  JoinColumn,
} from 'typeorm';
import { CartItem } from './cart-item.entity';
import { User } from '../users/user.entity';

@Entity('carts')
@Index('idx_carts_user_id', ['userId']) // ✅ Índice para búsquedas por usuario
export class Cart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.carts, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'fk_carts_user',
  })
  user: User;

  @Column({ type: 'uuid', name: 'user_id' })
  @Index('idx_carts_user_id_unique', { unique: true }) // ✅ Un carrito por usuario
  userId: string;

  @OneToMany(() => CartItem, (item) => item.cart, {
    cascade: ['remove'], // ✅ Solo cascade remove, no insert/update automático
  })
  items: CartItem[];

  // ✅ CAMPOS CALCULADOS
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'int', default: 0 })
  totalItems: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastActivityAt: Date;

  // ✅ ESTADO DEL CARRITO
  @Column({
    type: 'enum',
    enum: ['active', 'abandoned', 'converted'],
    default: 'active',
  })
  @Index('idx_carts_status')
  status: 'active' | 'abandoned' | 'converted';

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // ✅ MÉTODOS COMPUTED
  get itemCount(): number {
    return this.items?.length || 0;
  }

  get isEmpty(): boolean {
    return this.itemCount === 0;
  }
}
