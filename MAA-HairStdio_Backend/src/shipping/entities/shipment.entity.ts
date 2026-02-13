import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToOne,
} from 'typeorm';
import { Order } from '../../orders/orders.entity';
import { Address } from '../../address/address.entity';

export enum ShippingStatus {
  PENDING = 'pending', // Pendiente de cotización
  QUOTED = 'quoted', // Cotización obtenida
  CONFIRMED = 'confirmed', // Confirmado
  IN_TRANSIT = 'in_transit', // En tránsito
  DELIVERED = 'delivered', // Entregado
  FAILED = 'failed', // Falló
  CANCELLED = 'cancelled', // Cancelado
}

export enum ShippingCarrier {
  OCA = 'oca',
  ANDREANI = 'andreani',
  CORREO_ARGENTINO = 'correo_argentino',
  FEDEX = 'fedex',
  DHL = 'dhl',
  OTHER = 'other',
}

export enum ShippingService {
  EXPRESS = 'express',
  STANDARD = 'standard',
  ECONOMY = 'economy',
  PICKUP = 'pickup',
}

@Entity('shipments')
@Index('idx_shipments_order_id', ['order'])
@Index('idx_shipments_status', ['status'])
@Index('idx_shipments_zipnova_id', ['zipnovaShipmentId'])
@Index('idx_shipments_tracking_number', ['trackingNumber'])
@Index('idx_shipments_created_at', ['createdAt'])
export class Shipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ✅ RELACIONES
  @OneToOne(() => Order, (order) => order.shipment, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => Address, { eager: true })
  @JoinColumn({ name: 'destination_address_id' })
  destinationAddress: Address;

  // ✅ INFORMACIÓN DE ZIPNOVA
  @Column({ type: 'varchar', length: 100, nullable: true })
  zipnovaShipmentId: string; // ID del envío en Zipnova

  @Column({ type: 'varchar', length: 50 })
  zipnovaQuoteId: string; // ID de la cotización

  @Column({ type: 'varchar', length: 100, nullable: true })
  trackingNumber: string; // Número de rastreo

  @Column({ type: 'enum', enum: ShippingCarrier, default: ShippingCarrier.OTHER })
  carrier: ShippingCarrier; // Transportista (OCA, Andreani, etc.)

  @Column({ type: 'enum', enum: ShippingService, default: ShippingService.STANDARD })
  service: ShippingService; // Tipo de servicio

  // ✅ COSTOS Y TIEMPOS
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  shippingCost: number; // Costo del envío

  @Column({ type: 'integer', default: 0 })
  estimatedDays: number; // Días estimados

  @Column({ type: 'timestamp', nullable: true })
  estimatedDeliveryDate: Date; // Fecha estimada de entrega

  // ✅ ESTADO Y DOCUMENTACIÓN
  @Column({ type: 'enum', enum: ShippingStatus, default: ShippingStatus.PENDING })
  status: ShippingStatus; // Estado del envío

  @Column({ type: 'text', nullable: true })
  statusDescription: string; // Descripción del estado

  @Column({ type: 'varchar', length: 500, nullable: true })
  labelUrl?: string; // URL de la etiqueta de envío

  @Column({ type: 'text', nullable: true })
  observations: string; // Observaciones

  // ✅ DIMENSIONES Y PESO DE LA CARGA
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  totalWeight: number; // Peso total en kg

  @Column({ type: 'json', nullable: true })
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    weight: number;
    dimensions: {
      height: number;
      width: number;
      length: number;
    };
  }>; // Items del envío

  // ✅ INFORMACIÓN ADICIONAL
  @Column({ type: 'varchar', length: 100, nullable: true })
  waybillNumber: string; // Número de guía

  @Column({ type: 'json', nullable: true })
  zipnovaMetadata: Record<string, any>; // Datos adicionales de Zipnova

  @Column({ type: 'boolean', default: false })
  isPickup: boolean; // ¿Es retiro?

  @Column({ type: 'varchar', length: 100, nullable: true })
  pickupBranchId: string; // ID de sucursal de retiro

  // ✅ AUDITORÍA
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date; // Fecha de entrega

  @Column({ type: 'varchar', length: 255, nullable: true })
  deliveredBy: string; // Quién recibió
}
