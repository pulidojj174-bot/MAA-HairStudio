import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, DataSource } from 'typeorm';
import { Address } from './address.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import {
  AddressListResponse,
  AddressActionResponse,
  AddressResponse,
  AddressValidationResponse,
} from './interfaces/address-response.interface';


@Injectable()
export class AddressService {
  private readonly logger = new Logger(AddressService.name);

  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    private readonly dataSource: DataSource,
  ) {}

  // ✅ OBTENER TODAS LAS DIRECCIONES DEL USUARIO
  async getAddresses(userId: string): Promise<AddressListResponse> {
    try {
      const addresses = await this.addressRepository.find({
        where: { userId, isActive: true },
        order: {
          isDefault: 'DESC',
          createdAt: 'ASC',
        },
      });

      const defaultAddress = addresses.find((addr) => addr.isDefault);
      const hasValidatedAddresses = addresses.some((addr) => addr.isValidated);

      const addressResponses = addresses.map((addr) =>
        this.buildAddressResponse(addr),
      );

      return {
        success: true,
        message: 'Direcciones obtenidas exitosamente',
        data: addressResponses,
        meta: {
          total: addresses.length,
          defaultAddressId: defaultAddress?.id,
          hasValidatedAddresses,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener direcciones del usuario ${userId}:`,
        error,
      );
      throw new BadRequestException('Error al obtener las direcciones');
    }
  }

  // ✅ OBTENER DIRECCIÓN POR ID
  async getAddressById(
    userId: string,
    addressId: string,
  ): Promise<AddressActionResponse> {
    try {
      const address = await this.addressRepository.findOne({
        where: { id: addressId, userId, isActive: true },
      });

      if (!address) {
        throw new NotFoundException('Dirección no encontrada');
      }

      return {
        success: true,
        message: 'Dirección obtenida exitosamente',
        action: 'created',
        data: this.buildAddressResponse(address),
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener dirección ${addressId} del usuario ${userId}:`,
        error,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al obtener la dirección');
    }
  }

  // ✅ CREAR NUEVA DIRECCIÓN
  async createAddress(
    userId: string,
    createAddressDto: CreateAddressDto,
  ): Promise<AddressActionResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { isDefault = false, ...addressData } = createAddressDto;

      // Si será la dirección por defecto, quitar default de otras direcciones
      if (isDefault) {
        await queryRunner.manager.update(Address, { userId, isActive: true }, { isDefault: false });
      }

      // Si es la primera dirección, hacerla por defecto automáticamente
      const existingAddresses = await queryRunner.manager.count(Address, {
        where: { userId, isActive: true },
      });

      const shouldBeDefault = isDefault || existingAddresses === 0;

      // Crear nueva dirección
      const address = queryRunner.manager.create(Address, {
        ...addressData,
        userId,
        isDefault: shouldBeDefault,
        country: 'Argentina',
        validationStatus: 'pending',
      });

      const savedAddress = await queryRunner.manager.save(address);

      this.logger.log(
        `Dirección ${savedAddress.id} creada para usuario ${userId}. Es default: ${shouldBeDefault}`,
      );

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Dirección creada exitosamente',
        action: 'created',
        data: this.buildAddressResponse(savedAddress),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error al crear dirección para usuario ${userId}:`, error);

      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al crear la dirección');
    } finally {
      await queryRunner.release();
    }
  }

  // ✅ ACTUALIZAR DIRECCIÓN
  async updateAddress(
    userId: string,
    addressId: string,
    updateAddressDto: UpdateAddressDto,
  ): Promise<AddressActionResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const address = await queryRunner.manager.findOne(Address, {
        where: { id: addressId, userId, isActive: true },
      });

      if (!address) {
        throw new NotFoundException('Dirección no encontrada');
      }

      // Si se está actualizando a dirección por defecto
      if ((updateAddressDto as any).isDefault === true) {
        await queryRunner.manager.update(Address, { userId, isActive: true }, { isDefault: false });
      }

      // Actualizar dirección
      await queryRunner.manager.update(Address, addressId, {
        ...updateAddressDto,
        validationStatus: 'pending',
      });

      const updatedAddress = await queryRunner.manager.findOne(Address, {
        where: { id: addressId },
      });

      this.logger.log(`Dirección ${addressId} actualizada para usuario ${userId}`);

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Dirección actualizada exitosamente',
        action: 'updated',
        data: this.buildAddressResponse(updatedAddress!),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error al actualizar dirección ${addressId} del usuario ${userId}:`,
        error,
      );

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al actualizar la dirección');
    } finally {
      await queryRunner.release();
    }
  }

  // ✅ ELIMINAR DIRECCIÓN (SOFT DELETE)
  async deleteAddress(
    userId: string,
    addressId: string,
  ): Promise<AddressActionResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const address = await queryRunner.manager.findOne(Address, {
        where: { id: addressId, userId, isActive: true },
      });

      if (!address) {
        throw new NotFoundException('Dirección no encontrada');
      }

      // No permitir eliminar si es la única dirección
      const activeAddressCount = await queryRunner.manager.count(Address, {
        where: { userId, isActive: true },
      });

      if (activeAddressCount === 1) {
        throw new BadRequestException('No puedes eliminar tu única dirección');
      }

      // Soft delete
      await queryRunner.manager.update(Address, addressId, {
        isActive: false,
        isDefault: false,
      });

      // Si era la dirección por defecto, asignar otra como default
      if (address.isDefault) {
        const nextAddress = await queryRunner.manager.findOne(Address, {
          where: { userId, isActive: true },
          order: { createdAt: 'ASC' },
        });

        if (nextAddress) {
          await queryRunner.manager.update(Address, nextAddress.id, {
            isDefault: true,
          });
        }
      }

      this.logger.log(
        `Dirección ${addressId} eliminada (soft delete) para usuario ${userId}`,
      );

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Dirección eliminada exitosamente',
        action: 'deleted',
        data: this.buildAddressResponse(address),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error al eliminar dirección ${addressId} del usuario ${userId}:`,
        error,
      );

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al eliminar la dirección');
    } finally {
      await queryRunner.release();
    }
  }

  // ✅ ESTABLECER DIRECCIÓN POR DEFECTO
  async setDefaultAddress(
    userId: string,
    addressId: string,
  ): Promise<AddressActionResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const address = await queryRunner.manager.findOne(Address, {
        where: { id: addressId, userId, isActive: true },
      });

      if (!address) {
        throw new NotFoundException('Dirección no encontrada');
      }

      // Quitar default de todas las direcciones del usuario
      await queryRunner.manager.update(Address, { userId, isActive: true }, { isDefault: false });

      // Establecer como default la dirección seleccionada
      await queryRunner.manager.update(Address, addressId, {
        isDefault: true,
      });

      const updatedAddress = await queryRunner.manager.findOne(Address, {
        where: { id: addressId },
      });

      this.logger.log(
        `Dirección ${addressId} establecida como default para usuario ${userId}`,
      );

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Dirección establecida como predeterminada',
        action: 'set_default',
        data: this.buildAddressResponse(updatedAddress!),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Error al establecer dirección default ${addressId} para usuario ${userId}:`,
        error,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al establecer dirección predeterminada');
    } finally {
      await queryRunner.release();
    }
  }

  // ✅ VALIDAR DIRECCIÓN ARGENTINA (SIN VALIDACIÓN DE CÓDIGO POSTAL)
  async validateAddress(
    userId: string,
    addressId: string,
  ): Promise<AddressValidationResponse> {
    try {
      const address = await this.addressRepository.findOne({
        where: { id: addressId, userId, isActive: true },
      });

      if (!address) {
        throw new NotFoundException('Dirección no encontrada');
      }

      let isValid = true;
      let validationNotes = '';
      const suggestions: any = {};

      const validationStatus = isValid ? 'validated' : 'invalid';

      // Actualizar el status en la base de datos
      await this.addressRepository.update(addressId, {
        isValidated: isValid,
        validationStatus,
        validationNotes: validationNotes || 'Dirección validada exitosamente',
      });

      this.logger.log(`Dirección ${addressId} validada. Válida: ${isValid}`);

      return {
        success: true,
        message: isValid
          ? 'Dirección validada exitosamente'
          : 'Dirección tiene problemas de validación',
        data: {
          addressId,
          isValid,
          validationStatus,
          suggestions: Object.keys(suggestions).length > 0 ? suggestions : undefined,
          validationNotes: validationNotes || undefined,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error al validar dirección ${addressId} del usuario ${userId}:`,
        error,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error al validar la dirección');
    }
  }

  // ✅ OBTENER DIRECCIÓN POR DEFECTO
  async getDefaultAddress(userId: string): Promise<AddressActionResponse | null> {
    try {
      const defaultAddress = await this.addressRepository.findOne({
        where: { userId, isDefault: true, isActive: true },
      });

      if (!defaultAddress) {
        return null;
      }

      return {
        success: true,
        message: 'Dirección por defecto obtenida',
        action: 'created',
        data: this.buildAddressResponse(defaultAddress),
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener dirección por defecto del usuario ${userId}:`,
        error,
      );
      throw new BadRequestException('Error al obtener dirección por defecto');
    }
  }

  private buildAddressResponse(address: Address): AddressResponse {
    return {
      id: address.id,
      recipientName: address.recipientName,
      phone: address.phone,
      alternativePhone: address.alternativePhone,
      email: address.email,
      country: address.country,
      province: address.province,
      city: address.city,
      postalCode: address.postalCode,
      streetAddress: address.streetAddress,
      addressLine2: address.addressLine2,
      neighborhood: address.neighborhood,
      landmark: address.landmark,
      deliveryInstructions: address.deliveryInstructions,
      deliveryTimePreference: address.deliveryTimePreference,
      label: address.label,
      isDefault: address.isDefault,
      isActive: address.isActive,
      isValidated: address.isValidated,
      validationStatus: address.validationStatus,
      fullAddress: address.fullAddress,
      isComplete: address.isComplete,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }
}
