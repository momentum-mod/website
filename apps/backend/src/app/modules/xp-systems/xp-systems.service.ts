import { Injectable } from '@nestjs/common';
import { XpSystems } from '@momentum/xp-systems';

/*
 * This logic is all in a shared library now, we just need an extended class
 * with @Injectable for DI.
 */
@Injectable()
export class XpSystemsService extends XpSystems {}
