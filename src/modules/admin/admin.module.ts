import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminUsersService } from './admin-users.service';
import { AdminPurchasesService } from './admin-purchases.service';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminPromoCodesService } from './admin-promocodes.service';
import { AdminBlacklistService } from './admin-blacklist.service';
import { AdminReferralsService } from './admin-referrals.service';
import { AxiosModule } from '@common/axios';

@Module({
    imports: [AxiosModule],
    controllers: [AdminController],
    providers: [
        AdminService,
        AdminAuthService,
        AdminUsersService,
        AdminPurchasesService,
        AdminAnalyticsService,
        AdminPromoCodesService,
        AdminBlacklistService,
        AdminReferralsService,
    ],
    exports: [AdminBlacklistService, AdminPromoCodesService],
})
export class AdminModule {}

