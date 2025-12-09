import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Category } from '../categories/category.entity';
import { Product } from '../products/product.entity';

@Entity('subcategories')
export class Subcategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  @Index('idx_subcategories_name')
  name: string;

  @Column({ length: 120, nullable: true })
  @Index('idx_subcategories_slug')
  slug?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // ✅ CAMPOS QUE FALTABAN - Agregados para el service
  @Column({ type: 'int', default: 0 })
  @Index('idx_subcategories_display_order')
  displayOrder: number;

  @Column({ type: 'varchar', length: 7, nullable: true })
  color?: string; // ✅ Para colores hex como #FF5733

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon?: string; // ✅ Para nombres de iconos o clases CSS

  // ✅ RELACIÓN CON CATEGORY
  @ManyToOne(() => Category, (category) => category.subcategories, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'categoryId',
    foreignKeyConstraintName: 'fk_subcategories_category',
  })
  category: Category;

  @Column({ type: 'uuid' })
  @Index('idx_subcategories_category_id')
  categoryId: string;

  // ✅ RELACIÓN CON PRODUCTS
  @OneToMany(() => Product, (product) => product.subcategory)
  products: Product[];

  // ✅ ESTADOS
  @Column({ type: 'boolean', default: true })
  @Index('idx_subcategories_is_active')
  isActive: boolean;

  // ✅ TIMESTAMPS
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // ✅ COMPUTED PROPERTIES
  get productCount(): number {
    return this.products?.length || 0;
  }

}
