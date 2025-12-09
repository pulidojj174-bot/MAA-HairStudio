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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Roles } from 'src/auth/roles/roles.decorator';
import { ReorderCategoriesDto } from './dto/reorder-categories.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ✅ 1. RUTAS POST PRIMERO
  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'custom')
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  // ✅ 2. RUTAS GET SIN PARÁMETROS
  @Get()
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('search') search?: string,
    @Query('includeSubcategories', new ParseBoolPipe({ optional: true })) includeSubcategories = true,
  ) {
    return this.categoriesService.findAll(page, limit, search, includeSubcategories);
  }

  @Get('all')
  async findAllForSelect() {
    return this.categoriesService.findAllForSelect();
  }

  @Get('statistics')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'custom')
  async getStatistics() {
    return this.categoriesService.getCategoriesStats();
  }

  // ✅ 3. RUTAS GET CON PARÁMETROS ESPECÍFICOS (ANTES DE :id)
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  // ✅ 4. RUTAS PATCH ESPECÍFICAS (ANTES DE :id)
  @Patch('reorder')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'custom')
  async reorderCategories(
    @Body() reorderDto: ReorderCategoriesDto,
  ) {
    console.log('🎯 Ejecutando PATCH /categories/reorder');
    console.log('📦 DTO recibido:', reorderDto);
    return this.categoriesService.reorderCategories(reorderDto.categories);
  }

  // ✅ 5. RUTAS CON PARÁMETROS DINÁMICOS (SIEMPRE AL FINAL)
  @Get(':id')
  async findOne(
    @Param('id', new ParseUUIDPipe({
      version: '4',
      errorHttpStatusCode: 400,
      exceptionFactory: () =>
        new BadRequestException('El id debe tener formato UUID v4 válido.'),
    })) id: string,
  ) {
    console.log('🎯 Ejecutando GET /categories/:id con id:', id);
    return this.categoriesService.findOne(id);
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
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    console.log('🎯 Ejecutando PATCH /categories/:id con id:', id);
    return this.categoriesService.update(id, updateCategoryDto);
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
    return this.categoriesService.remove(id);
  }
}
