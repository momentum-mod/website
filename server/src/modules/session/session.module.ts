import { Module } from '@nestjs/common';
import { RunSessionService } from './run/run-session.service';
import { RepoModule } from '../repo/repo.module';
import { FileStoreModule } from '../filestore/file-store.module';
import { XpSystemsModule } from '../xp-systems/xp-systems.module';

@Module({
    imports: [RepoModule, FileStoreModule, XpSystemsModule],
    providers: [RunSessionService],
    exports: [RunSessionService]
})
export class SessionModule {}
