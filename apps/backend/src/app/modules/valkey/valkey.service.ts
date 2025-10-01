import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit
} from '@nestjs/common';
import Valkey, { RedisOptions } from 'iovalkey';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ValkeyService
  extends Valkey
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger('Valkey Service');

  constructor(readonly configService: ConfigService) {
    const options: RedisOptions = {
      lazyConnect: true,
      disconnectTimeout: 5000
    };
    const port = configService.getOrThrow('valkey.port');
    if (port === 0) {
      options.path = configService.getOrThrow('valkey.host');
    } else {
      options.port = port;
      options.host = configService.getOrThrow('valkey.host');
    }
    super(options);

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
