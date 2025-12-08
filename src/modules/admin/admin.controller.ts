import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminUsersService } from './admin-users.service';
import { AdminPurchasesService } from './admin-purchases.service';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminPromoCodesService } from './admin-promocodes.service';
import { AdminBlacklistService } from './admin-blacklist.service';
import { AdminReferralsService } from './admin-referrals.service';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminConfigService } from './admin-config.service';

@Controller('admin')
export class AdminController {
    constructor(
        private readonly adminService: AdminService,
        private readonly authService: AdminAuthService,
        private readonly usersService: AdminUsersService,
        private readonly purchasesService: AdminPurchasesService,
        private readonly analyticsService: AdminAnalyticsService,
        private readonly promoCodesService: AdminPromoCodesService,
        private readonly blacklistService: AdminBlacklistService,
        private readonly referralsService: AdminReferralsService,
        private readonly configService: AdminConfigService,
    ) {}

    // Auth endpoints
    @Post('auth/login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() body: { username: string; password: string }) {
        return this.authService.login(body.username, body.password);
    }

    @Post('auth/logout')
    @UseGuards(AdminAuthGuard)
    @HttpCode(HttpStatus.OK)
    async logout(@Body() body: { token: string }) {
        await this.authService.logout(body.token);
        return { message: 'Logged out successfully' };
    }

    @Get('auth/validate')
    @UseGuards(AdminAuthGuard)
    async validate() {
        return { valid: true };
    }

    // Stats
    @Get('stats')
    @UseGuards(AdminAuthGuard)
    async getStats() {
        return this.adminService.getStats();
    }

    // Users endpoints
    @Get('users')
    @UseGuards(AdminAuthGuard)
    async getUsers(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
    ) {
        return this.usersService.getUsers(
            page ? parseInt(page, 10) : 1,
            limit ? parseInt(limit, 10) : 50,
            search,
        );
    }

    @Get('users/:id')
    @UseGuards(AdminAuthGuard)
    async getUserById(@Param('id') id: string) {
        return this.usersService.getUserById(id);
    }

    @Put('users/:id')
    @UseGuards(AdminAuthGuard)
    async updateUser(@Param('id') id: string, @Body() body: any) {
        return this.usersService.updateUser(id, body);
    }

    @Delete('users/:id')
    @UseGuards(AdminAuthGuard)
    async deleteUser(@Param('id') id: string) {
        return this.usersService.deleteUser(id);
    }

    // Purchases endpoints
    @Get('purchases')
    @UseGuards(AdminAuthGuard)
    async getPurchases(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('status') status?: string,
        @Query('type') type?: string,
        @Query('userId') userId?: string,
    ) {
        return this.purchasesService.getPurchases(
            page ? parseInt(page, 10) : 1,
            limit ? parseInt(limit, 10) : 50,
            {
                status: status as any,
                type: type as any,
                userId,
            },
        );
    }

    @Get('purchases/:id')
    @UseGuards(AdminAuthGuard)
    async getPurchaseById(@Param('id') id: string) {
        return this.purchasesService.getPurchaseById(id);
    }

    @Put('purchases/:id/status')
    @UseGuards(AdminAuthGuard)
    async updatePurchaseStatus(
        @Param('id') id: string,
        @Body() body: { status: string },
    ) {
        return this.purchasesService.updatePurchaseStatus(id, body.status as any);
    }

    @Delete('purchases/:id')
    @UseGuards(AdminAuthGuard)
    async deletePurchase(@Param('id') id: string) {
        return this.purchasesService.deletePurchase(id);
    }

    @Post('purchases/cleanup')
    @UseGuards(AdminAuthGuard)
    async cleanupOldTransactions(@Body() body: { daysOld?: number }) {
        return this.purchasesService.cleanupOldTransactions(body.daysOld || 7);
    }

    // Analytics endpoints
    @Get('analytics/financial')
    @UseGuards(AdminAuthGuard)
    async getFinancialAnalytics(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.analyticsService.getFinancialAnalytics(
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
        );
    }

    @Get('analytics/tariff-rating')
    @UseGuards(AdminAuthGuard)
    async getTariffRating() {
        return this.analyticsService.getTariffRating();
    }

    @Get('analytics/level-rating')
    @UseGuards(AdminAuthGuard)
    async getLevelRating() {
        return this.analyticsService.getLevelRating();
    }

    @Get('analytics/users-by-month')
    @UseGuards(AdminAuthGuard)
    async getUsersByMonth() {
        return this.analyticsService.getUsersByMonth();
    }

    // Promo codes endpoints
    @Get('promocodes')
    @UseGuards(AdminAuthGuard)
    async getPromoCodes(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
    ) {
        return this.promoCodesService.getPromoCodes(
            page ? parseInt(page, 10) : 1,
            limit ? parseInt(limit, 10) : 50,
            search,
        );
    }

    @Get('promocodes/:id')
    @UseGuards(AdminAuthGuard)
    async getPromoCodeById(@Param('id') id: string) {
        return this.promoCodesService.getPromoCodeById(id);
    }

    @Post('promocodes')
    @UseGuards(AdminAuthGuard)
    async createPromoCode(@Body() body: any) {
        return this.promoCodesService.createPromoCode(body);
    }

    @Put('promocodes/:id')
    @UseGuards(AdminAuthGuard)
    async updatePromoCode(@Param('id') id: string, @Body() body: any) {
        return this.promoCodesService.updatePromoCode(id, body);
    }

    @Delete('promocodes/:id')
    @UseGuards(AdminAuthGuard)
    async deletePromoCode(@Param('id') id: string) {
        return this.promoCodesService.deletePromoCode(id);
    }

    // Blacklist endpoints
    @Get('blacklist')
    @UseGuards(AdminAuthGuard)
    async getBlacklist(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
    ) {
        return this.blacklistService.getBlacklist(
            page ? parseInt(page, 10) : 1,
            limit ? parseInt(limit, 10) : 50,
            search,
        );
    }

    @Get('blacklist/:id')
    @UseGuards(AdminAuthGuard)
    async getBlacklistItemById(@Param('id') id: string) {
        return this.blacklistService.getBlacklistItemById(id);
    }

    @Post('blacklist')
    @UseGuards(AdminAuthGuard)
    async addToBlacklist(@Body() body: any) {
        const data: any = {};
        if (body.telegramId) {
            data.telegramId = BigInt(body.telegramId);
        }
        if (body.auraId) {
            data.auraId = body.auraId;
        }
        data.reason = body.reason;
        data.createdBy = body.createdBy;
        return this.blacklistService.addToBlacklist(data);
    }

    @Put('blacklist/:id')
    @UseGuards(AdminAuthGuard)
    async updateBlacklistItem(@Param('id') id: string, @Body() body: any) {
        return this.blacklistService.updateBlacklistItem(id, body);
    }

    @Delete('blacklist/:id')
    @UseGuards(AdminAuthGuard)
    async removeFromBlacklist(@Param('id') id: string) {
        return this.blacklistService.removeFromBlacklist(id);
    }

    // Referrals endpoints
    @Get('referrals/network')
    @UseGuards(AdminAuthGuard)
    async getReferralNetwork(
        @Query('userId') userId?: string,
        @Query('depth') depth?: string,
    ) {
        return this.referralsService.getReferralNetwork(
            userId,
            depth ? parseInt(depth, 10) : undefined,
        );
    }

    @Get('referrals/stats')
    @UseGuards(AdminAuthGuard)
    async getReferralStats() {
        return this.referralsService.getReferralStats();
    }

    // Config endpoints
    @Get('config')
    @UseGuards(AdminAuthGuard)
    async getConfig() {
        return this.configService.getConfig();
    }

    @Put('config/pricing')
    @UseGuards(AdminAuthGuard)
    async updatePricingConfig(@Body() body: any) {
        await this.configService.updatePricingConfig(body.config, body.updatedBy);
        return { message: 'Pricing config updated' };
    }

    @Put('config/closed-mode')
    @UseGuards(AdminAuthGuard)
    async updateClosedMode(@Body() body: { enabled: boolean; updatedBy?: string }) {
        await this.configService.updateClosedMode(body.enabled, body.updatedBy);
        return { message: 'Closed mode updated' };
    }

    @Put('config')
    @UseGuards(AdminAuthGuard)
    async updateConfig(@Body() body: any) {
        if (body.pricing) {
            await this.configService.updatePricingConfig(body.pricing);
        }
        if (body.closedMode !== undefined) {
            await this.configService.updateClosedMode(body.closedMode);
        }
        return this.configService.getConfig();
    }

    @Put('config/:key')
    @UseGuards(AdminAuthGuard)
    async updateConfigKey(
        @Param('key') key: string,
        @Body() body: { value: string; description?: string; updatedBy?: string },
    ) {
        await this.configService.updateConfig(key, body.value, body.description, body.updatedBy);
        return { message: 'Config updated' };
    }
}

