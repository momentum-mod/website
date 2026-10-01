import { Module } from '@nestjs/common';
import { DbModule } from '../database/db.module';
import { WebsocketsModule } from '../websockets/websockets.module';
import { ChatBansService } from './chat-bans.service';

@Module({
  imports: [DbModule, WebsocketsModule],
  providers: [ChatBansService],
  exports: [ChatBansService]
})
export class ChatBansModule {}
