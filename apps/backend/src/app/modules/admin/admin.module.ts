import { Module, forwardRef } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { MapsModule } from '../maps/maps.module';
import { UsersModule } from '../users/users.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminActivityService } from './admin-activity.service';
import { MapReviewModule } from '../map-review/map-review.module';
import { KillswitchModule } from '../killswitch/killswitch.module';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    DbModule,
    forwardRef(() => MapsModule),
    forwardRef(() => UsersModule),
    forwardRef(() => MapReviewModule),
    KillswitchModule,
    NotificationsModule
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminActivityService, NotificationsService],
  exports: [AdminActivityService]
})
export class AdminModule {}
