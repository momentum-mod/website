import { Module } from '@nestjs/common';
import { MapsRepo } from './maps.repo';
import { MapsController } from './maps.controller';
import { MapsService } from './maps.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { FileStoreModule } from '../../@common/filestore/fileStore.module';

@Module({
    imports: [PrismaModule, AuthModule, FileStoreModule],
    controllers: [MapsController],
    providers: [MapsService, MapsRepo],
    // TODO: As per our architectural structure, repos shouldn't be available to other modules. Remove once Alex resolves circs.
    exports: [MapsService, MapsRepo]
})
export class MapsModule {}
