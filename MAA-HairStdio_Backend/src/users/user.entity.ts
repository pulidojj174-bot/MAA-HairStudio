import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer'; // ✅ AGREGAR
import { Wishlist } from '../wishlist/wishlist.entity';
import { Cart } from '../cart/cart.entity';
import { Address } from '../address/address.entity';
import { Order } from 'src/orders/orders.entity';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  CUSTOM = 'custom',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  name?: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  @Exclude({ toPlainOnly: true }) // ✅ SOLUCIÓN: Ocultar automáticamente
  password_hash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @Column({ nullable: true })
  @Exclude({ toPlainOnly: true }) // ✅ OCULTAR token de reset
  resetPasswordToken?: string;

  // ✅ CAMBIO: Ahora es un código de 6 dígitos en lugar de token largo
  @Column({ type: 'varchar', nullable: true, length: 6 })
  resetPasswordCode?: string | null; // Código de 6 dígitos

  @Column({ nullable: true, type: 'timestamptz' })
  @Exclude({ toPlainOnly: true }) // ✅ OCULTAR fecha de expiración
  resetPasswordExpires?: Date | null;

  @OneToMany(() => Wishlist, (wishlist) => wishlist.user)
  wishlists: Wishlist[];

  @OneToMany(() => Cart, (cart) => cart.user)
  carts: Cart[];

  @OneToMany(() => Address, (address) => address.user)
  addresses: Address[];

  @OneToMany(() => Order, (order) => order.user, {
    cascade: false, // ✅ No eliminar órdenes al eliminar usuario (datos históricos)
    lazy: true,     // ✅ Cargar solo cuando se necesite (performance)
    nullable: true, // ✅ Usuario puede no tener órdenes
  })
  orders: Order[];
}