import { DEFAULT_ICON_PACK, ICON_PACKS } from './index';
import { Injectable } from '@angular/core';
import { kebabCase } from '@momentum/util-fn';

/**
 * This service simply provides a nested Map of SVG HTML strings containing icons
 * in ICON_PACKS. Instances of the mom-icon component inject it as a  performant
 * way of fetching the SVG strings.
 */
@Injectable({ providedIn: 'root' })
export class IconService {
  private readonly packs: ReadonlyMap<string, ReadonlyMap<string, string>> =
    new Map(
      Object.entries(ICON_PACKS).map(([pack, icons]) => [
        pack,
        new Map(
          Object.entries(icons).map(([name, path]) => [
            kebabCase(pack === 'mdi' ? name.replace(/^mdi/, '') : name),
            `<svg viewBox="0 0 24 24"><path fill="currentColor" d="${path}"></path></svg>`
          ])
        )
      ])
    );

  getIcon(iconName: string, packName = DEFAULT_ICON_PACK): string | undefined {
    return this.packs.get(packName)?.get(iconName);
  }
}
