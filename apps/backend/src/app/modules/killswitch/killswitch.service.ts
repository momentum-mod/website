import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  OnModuleInit
} from '@nestjs/common';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { KillswitchType, Killswitches } from '@momentum/constants';
import { Enum } from '@momentum/enum';

export const KILLSWITCH_CONFIG_ID = 'Killswitches';

@Injectable()
export class KillswitchService implements OnModuleInit {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService
  ) {}

  private switches: Killswitches;
  private readonly logger = new Logger('Killswitch Service');

  public async onModuleInit() {
    const dbResponse = await this.db.config.findUnique({
      where: { id: KILLSWITCH_CONFIG_ID }
    });

    const storedSwitches = dbResponse?.value as Killswitches;
    if (storedSwitches) {
      const areValidSwitches = this.validateKillswitches(storedSwitches);
      if (areValidSwitches) {
        this.switches = storedSwitches;
        this.logger.log(
          `Killswitches found, current killswitches are: ${JSON.stringify(storedSwitches)}`
        );
      } else {
        this.logger.error('Stored killswitches failed validation.');
        this.switches = {} as Killswitches;
        await this.updateKillswitches(
          Object.fromEntries(
            Enum.values(KillswitchType).map((type: KillswitchType) => [
              type,
              false
            ])
          ) as Killswitches
        );
      }
    } else {
      this.logger.log(
        'No killswitches found, creating default switches as disabled.'
      );
      this.switches = {} as Killswitches;
      await this.updateKillswitches(
        Object.fromEntries(
          Enum.values(KillswitchType).map((type: KillswitchType) => [
            type,
            false
          ])
        ) as Killswitches
      );
    }
  }

  public checkKillswitch(type: KillswitchType): boolean {
    return this.switches[type];
  }

  public async updateKillswitches(switches: Killswitches): Promise<void> {
    if (!this.validateKillswitches(switches)) {
      throw new BadRequestException();
    }

    for (const [type, value] of Object.entries(switches)) {
      this.switches[type] = value;
    }

    await this.db.config.upsert({
      where: { id: KILLSWITCH_CONFIG_ID },
      update: { value: this.switches },
      create: { id: KILLSWITCH_CONFIG_ID, value: this.switches }
    });
  }

  public async getKillSwitches() {
    const dbResponse = await this.db.config.findUnique({
      where: { id: KILLSWITCH_CONFIG_ID }
    });
    return dbResponse.value as Killswitches;
  }

  private validateKillswitches(switches: Killswitches): boolean {
    const switchTypes = Enum.values(KillswitchType);
    return Object.entries(switches).every(
      ([type, value]) =>
        (value === true || value === false) &&
        switchTypes.includes(type as KillswitchType)
    );
  }
}
