import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit
} from '@nestjs/common';
import Valkey from 'iovalkey';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ValkeyService
  extends Valkey
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger('Valkey Service');

  constructor(readonly configService: ConfigService) {
    super({
      lazyConnect: true,
      port: configService.getOrThrow('valkey.port'),
      disconnectTimeout: 5000
    });

    this.on('error', (err) => {
      this.logger.fatal('Valkey client error: ', err);
    });
  }

  async onModuleInit() {
    await this.connect();
    return this.logger.log('Valkey connection established');
  }

  async onModuleDestroy() {
    await this.quit();
  }
}
