import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Product } from '../products/product.entity';

@Entity('wishlists')
@Index('idx_wishlists_user_product', ['userId', 'productId'], { unique: true }) // ✅ Un producto por usuario
@Index('idx_wishlists_user_id', ['userId'])
@Index('idx_wishlists_product_id', ['productId'])
@Index('idx_wishlists_created_at', ['createdAt'])
export class Wishlist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.wishlists, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  })
  @JoinColumn({ 
    name: 'user_id',
    foreignKeyConstraintName: 'fk_wishlists_user'
  })
  user: User;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => Product, { 
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  })
  @JoinColumn({ 
    name: 'product_id',
    foreignKeyConstraintName: 'fk_wishlists_product'
  })
  product: Product;

  @Column({ type: 'uuid', name: 'product_id' })
  productId: string;

  // ✅ CAMPOS ADICIONALES ÚTILES
  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ 
    type: 'enum', 
    enum: ['private', 'public', 'shared'], 
    default: 'private' 
  })
  visibility: 'private' | 'public' | 'shared';

  // ✅ METADATOS PARA ANALYTICS
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceWhenAdded: number;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastViewedAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
