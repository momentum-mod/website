import { MaterialDesignIcons, MomentumIcons, SimpleIcons } from './index';
import { kebabCase } from 'lodash-es';
import { NbIconLibraries } from '@nebular/theme';

export const initIconPacks = (iconLibraries: NbIconLibraries): void => {
  const packs: [string, any][] = [
    ['si', SimpleIcons],
    ['mdi', MaterialDesignIcons],
    ['mom', MomentumIcons]
  ];
  for (const [packName, icons] of packs)
    iconLibraries.registerSvgPack(
      packName,
      Object.fromEntries(
        Object.entries(icons).map(([iconName, path]) => [
          kebabCase(
            packName === 'mdi' ? iconName.replace(/^mdi/, '') : iconName
          ),
          `<svg viewBox="0 0 24 24"><path fill="#fff" d="${path}"></path></svg>`
        ])
      )
    );
  iconLibraries.setDefaultPack('mdi');
};
