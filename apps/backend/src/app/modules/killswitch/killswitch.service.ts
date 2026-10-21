import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  OnModuleInit
} from '@nestjs/common';
import { KillswitchType, Killswitches } from '@momentum/constants';
import * as Enum from '@momentum/enum';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { ValkeyService } from '../valkey/valkey.service';
import { isFirstWorker } from '../../../clustered';

export const KILLSWITCH_CONFIG_ID = 'Killswitches';
export const KILLSWITCH_VALKEY_KEY = 'momentum:killswitches';

@Injectable()
export class KillswitchService implements OnModuleInit {
  private readonly logger = new Logger('Killswitch Service');

  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly valkey: ValkeyService
  ) {}

  /**
   * Pull killswitch state from Postgres and push to Valkey.
   * Postgres is our ultimate source of truth, so fine to overwrite any
   * existing Valkey state.
   */
  public async onModuleInit(): Promise<void> {
    if (!isFirstWorker()) {
      return;
    }

    const dbResponse = await this.db.config.findUnique({
      where: { id: KILLSWITCH_CONFIG_ID }
    });

    const storedSwitches = dbResponse?.value as Killswitches | undefined;

    let switches = {
      ...this.getDefaultSwitches(),
      ...storedSwitches
    };

    if (!this.validateKillswitches(switches)) {
      this.logger.error(
        'Stored killswitches failed validation, data state is invalid somehow! Using defaults (all disabled).'
      );
      switches = this.getDefaultSwitches();
    }

    await this.valkey.hset(
      KILLSWITCH_VALKEY_KEY,
      ...Object.entries(switches).flatMap(([type, value]) => [
        type,
        value.toString()
      ])
    );
  }

  public async checkKillswitch(type: KillswitchType): Promise<boolean> {
    const value = await this.valkey.hget(KILLSWITCH_VALKEY_KEY, type);
    return this.parseSwitchValue(type, value);
  }

  public async updateKillswitches(
    switches: Partial<Killswitches>
  ): Promise<void> {
    if (!this.validateKillswitches(switches)) {
      throw new BadRequestException();
    }

    const updates = Enum.values(KillswitchType).flatMap((type) => {
      const value = switches[type];
      return value !== undefined ? [type, value.toString()] : [];
    });

    if (updates.length > 0) {
      await this.valkey.hset(KILLSWITCH_VALKEY_KEY, ...updates);
    }
  }

  public async getKillSwitches(): Promise<Killswitches> {
    const storedSwitches = await this.valkey.hgetall(KILLSWITCH_VALKEY_KEY);
    return Object.fromEntries(
      Enum.values(KillswitchType).map((type) => [
        type,
        this.parseSwitchValue(type, storedSwitches[type])
      ])
    ) as Killswitches;
  }

  public async resetAllKillswitches(): Promise<void> {
    await this.updateKillswitches(this.getDefaultSwitches());
  }

  private getDefaultSwitches(): Killswitches {
    return Object.fromEntries(
      Enum.values(KillswitchType).map((type) => [type, false])
    ) as Killswitches;
  }

  private parseSwitchValue(
    type: KillswitchType,
    value: string | null | undefined
  ): boolean {
    if (value == null || value === 'false') return false;
    if (value === 'true') return true;

    this.logger.error(`Invalid Valkey value for ${type}: ${value}`);
    return false;
  }

  private validateKillswitches(
    switches: unknown
  ): switches is Partial<Killswitches> {
    if (
      typeof switches !== 'object' ||
      switches == null ||
      Array.isArray(switches)
    ) {
      return false;
    }

    const switchTypes = Enum.values(KillswitchType);
    return Object.entries(switches).every(
      ([type, value]) =>
        (value === true || value === false) &&
        switchTypes.includes(type as KillswitchType)
    );
  }
}
