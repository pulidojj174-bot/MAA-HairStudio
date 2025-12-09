import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
  ParseIntPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { SubcategoriesService } from './subcategories.service';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';

@Controller('subcategories')
export class SubcategoriesController {
  constructor(private readonly subcategoriesService: SubcategoriesService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'custom')
  async create(@Body() createSubcategoryDto: CreateSubcategoryDto) {
    return this.subcategoriesService.create(createSubcategoryDto);
  }

  // ✅ MEJORADO: findAll con filtros y paginación
  @Get()
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('categoryId', new ParseUUIDPipe({ optional: true })) categoryId?: string,
    @Query('search') search?: string,
    @Query('includeProducts', new ParseBoolPipe({ optional: true })) includeProducts = false,
  ) {
    return this.subcategoriesService.findAll(page, limit, categoryId, search, includeProducts);
  }

  // ✅ NUEVO: Obtener subcategorías por categoría
  @Get('by-category/:categoryId')
  async findByCategory(
    @Param('categoryId', new ParseUUIDPipe({
      version: '4',
      errorHttpStatusCode: 400,
      exceptionFactory: () =>
        new BadRequestException('El categoryId debe tener formato UUID v4 válido.'),
    })) categoryId: string,
  ) {
    return this.subcategoriesService.findByCategory(categoryId);
  }

  // ✅ NUEVO: Subcategorías para select (sin paginación)
  @Get('all')
  async findAllForSelect() {
    return this.subcategoriesService.findAllForSelect();
  }

  // ✅ NUEVO: Estadísticas de subcategorías
  @Get('statistics')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'custom')
  async getStatistics() {
    return this.subcategoriesService.getSubcategoriesStats();
  }

  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe({
      version: '4',
      errorHttpStatusCode: 400,
      exceptionFactory: () =>
        new BadRequestException('El id debe tener formato UUID v4 válido.'),
    })) id: string,
  ) {
    return this.subcategoriesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'custom')
  async update(
    @Param('id', new ParseUUIDPipe({
      version: '4',
      errorHttpStatusCode: 400,
      exceptionFactory: () =>
        new BadRequestException('El id debe tener formato UUID v4 válido.'),
    })) id: string,
    @Body() updateSubcategoryDto: UpdateSubcategoryDto,
  ) {
    return this.subcategoriesService.update(id, updateSubcategoryDto);
  }

  // ✅ NUEVO: Reordenar subcategorías dentro de una categoría
  @Patch('category/:categoryId/reorder')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'custom')
  async reorderSubcategories(
    @Param('categoryId', new ParseUUIDPipe({
      version: '4',
      errorHttpStatusCode: 400,
      exceptionFactory: () =>
        new BadRequestException('El categoryId debe tener formato UUID v4 válido.'),
    })) categoryId: string,
    @Body() subcategoryOrders: Array<{ id: string; displayOrder: number }>,
  ) {
    return this.subcategoriesService.reorderSubcategories(categoryId, subcategoryOrders);
  }

  // ✅ NUEVO: Buscar subcategoría por slug
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.subcategoriesService.findBySlug(slug);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'custom')
  async remove(
    @Param('id', new ParseUUIDPipe({
      version: '4',
      errorHttpStatusCode: 400,
      exceptionFactory: () =>
        new BadRequestException('El id debe tener formato UUID v4 válido.'),
    })) id: string,
  ) {
    return this.subcategoriesService.remove(id);
  }
}
