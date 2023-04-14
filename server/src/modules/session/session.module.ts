import { Module } from '@nestjs/common';
import { RunSessionService } from './run/run-session.service';
import { RepoModule } from '../repo/repo.module';
import { FileStoreModule } from '../filestore/file-store.module';
import { XpSystemsModule } from '../xp-systems/xp-systems.module';
import { SessionController } from '@modules/session/session.controller';

@Module({
    imports: [RepoModule, FileStoreModule, XpSystemsModule],
    controllers: [SessionController],
    providers: [RunSessionService]
})
export class SessionModule {}
