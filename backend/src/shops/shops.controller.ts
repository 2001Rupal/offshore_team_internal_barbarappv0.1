import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ShopsService } from './shops.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('Shops')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER)
@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new shop for the authenticated owner' })
  @ApiResponse({ status: 201, description: 'Shop created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Owner already has a shop created' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateShopDto,
  ) {
    return this.shopsService.create(user.id, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get the shop owned by the currently logged in owner' })
  @ApiResponse({ status: 200, description: 'Owner shop details' })
  @ApiResponse({ status: 404, description: 'No shop found for owner' })
  async getMyShop(@CurrentUser() user: AuthenticatedUser) {
    return this.shopsService.findMy(user.id);
  }

  @Get(':shopId')
  @ApiOperation({ summary: 'Get shop details by ID' })
  @ApiResponse({ status: 200, description: 'Shop details' })
  @ApiResponse({ status: 403, description: 'Forbidden access to this shop' })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  async getShop(
    @CurrentUser() user: AuthenticatedUser,
    @Param('shopId') shopId: string,
  ) {
    return this.shopsService.findById(shopId, user.id);
  }

  @Patch(':shopId')
  @ApiOperation({ summary: 'Update shop details' })
  @ApiResponse({ status: 200, description: 'Shop updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: not shop owner' })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('shopId') shopId: string,
    @Body() dto: UpdateShopDto,
  ) {
    return this.shopsService.update(shopId, user.id, dto);
  }
}
