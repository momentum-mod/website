import { forwardRef, Module } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { FileStoreModule } from '../filestore/file-store.module';
import { MapsModule } from '../maps/maps.module';
import { MapReviewService } from './map-review.service';
import { MapReviewController } from './map-review.controller';
import { MapReviewCommentService } from './map-review-comment.service';
import { AdminModule } from '../admin/admin.module';
import { KillswitchModule } from '../killswitch/killswitch.module';

@Module({
  imports: [
    DbModule,
    FileStoreModule,
    KillswitchModule,
    forwardRef(() => MapsModule),
    forwardRef(() => AdminModule)
  ],
  controllers: [MapReviewController],
  providers: [MapReviewService, MapReviewCommentService],
  exports: [MapReviewService, MapReviewCommentService]
})
export class MapReviewModule {}
