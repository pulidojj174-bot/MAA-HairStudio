import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  OneToMany, 
  CreateDateColumn, 
  UpdateDateColumn,
  Index 
} from 'typeorm';
import { Subcategory } from '../subcategories/subcategory.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  @Index() // ✅ AGREGAR índice para búsquedas
  name: string;

  // ✅ NUEVO: Descripción opcional
  @Column({ type: 'text', nullable: true })
  description?: string;

  // ✅ NUEVO: Slug para URLs amigables (opcional como mencionaste)
  @Column({ unique: true, length: 120, nullable: true })
  @Index() // ✅ Índice para búsquedas por slug
  slug?: string;

  // ✅ NUEVO: Imagen opcional (para implementación futura)
  @Column({ nullable: true })
  image?: string;

  // ✅ NUEVO: Icono opcional (para implementación futura)
  @Column({ nullable: true })
  icon?: string;

  // ✅ NUEVO: Orden de visualización
  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  // ✅ NUEVO: Color para UI (opcional)
  @Column({ length: 7, nullable: true }) // Formato hex #FFFFFF
  color?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Subcategory, (subcategory) => subcategory.category, {
    cascade: false, // ✅ No eliminar subcategorías automáticamente
    lazy: true,     // ✅ Cargar solo cuando sea necesario
  })
  subcategories: Subcategory[];
}
