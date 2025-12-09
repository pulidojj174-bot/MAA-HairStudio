import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
  Check,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('addresses')
@Index('idx_addresses_user_id', ['userId'])
@Index('idx_addresses_user_default', ['userId', 'isDefault'])
@Index('idx_addresses_location', ['province', 'city']) // ✅ Cambio de department a province
/* @Check('chk_addresses_phone_format', "phone ~ '^[+]?[0-9]{8,15}$'")  */// ✅ Validación formato teléfono argentino
export class Address {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.addresses, { 
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  })
  @JoinColumn({ 
    name: 'user_id',
    foreignKeyConstraintName: 'fk_addresses_user'
  })
  user: User;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  // ✅ INFORMACIÓN DEL DESTINATARIO
  @Column({ type: 'varchar', length: 100 })
  recipientName: string;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  alternativePhone?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email?: string;

  // ✅ INFORMACIÓN DE UBICACIÓN (Argentina)
  @Column({ type: 'varchar', length: 50, default: 'Argentina' })
  country: string;

  @Column({ type: 'varchar', length: 50 })
  @Index('idx_addresses_province') // ✅ Cambio de department a province
  province: string; // ✅ Provincia argentina

  @Column({ type: 'varchar', length: 50 })
  @Index('idx_addresses_city')
  city: string;

  @Column({ type: 'varchar', length: 10 })
  postalCode: string; // ✅ Formato argentino (C1000AAA o 1000)

  // ✅ DIRECCIÓN DETALLADA
  @Column({ type: 'varchar', length: 200 })
  streetAddress: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  addressLine2?: string; // ✅ Piso, depto, oficina

  @Column({ type: 'varchar', length: 100, nullable: true })
  neighborhood?: string; // ✅ Barrio

  @Column({ type: 'text', nullable: true })
  landmark?: string;

  // ✅ INSTRUCCIONES DE ENTREGA
  @Column({ type: 'text', nullable: true })
  deliveryInstructions?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  deliveryTimePreference?: string;

  // ✅ METADATA
  @Column({ type: 'varchar', length: 50, nullable: true })
  label?: string;

  @Column({ type: 'boolean', default: false })
  @Index('idx_addresses_default')
  isDefault: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // ✅ VALIDACIÓN Y STATUS
  @Column({ type: 'boolean', default: false })
  isValidated: boolean;

  @Column({ 
    type: 'enum', 
    enum: ['pending', 'validated', 'invalid'], 
    default: 'pending' 
  })
  validationStatus: 'pending' | 'validated' | 'invalid';

  @Column({ type: 'text', nullable: true })
  validationNotes?: string;

  // ✅ GEOLOCALIZACIÓN (opcional para futuro)
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude?: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  // ✅ MÉTODOS COMPUTED
  get fullAddress(): string {
    const parts = [
      this.streetAddress,
      this.addressLine2,
      this.neighborhood,
      this.city,
      this.province, // ✅ Cambio de department a province
      this.country
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  get isComplete(): boolean {
    return !!(
      this.recipientName &&
      this.phone &&
      this.streetAddress &&
      this.city &&
      this.province && // ✅ Cambio de department a province
      this.postalCode
    );
  }
}
