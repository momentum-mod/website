import { KebabCase, Replace } from 'type-fest';
import * as MaterialDesignIcons from './packs/material-design-icons.icons';
import * as SimpleIcons from './packs/simple-icons.icons';
import * as MomentumIcons from './packs/momentum.icons';

export { MaterialDesignIcons, SimpleIcons, MomentumIcons };

export type SimpleIcon = KebabCase<keyof typeof SimpleIcons>;
export type MaterialDesignIcon = KebabCase<
  Replace<keyof typeof MaterialDesignIcons, 'mdi', ''>
>;
export type MomentumIcon = KebabCase<keyof typeof MomentumIcons>;

export type Icon = MaterialDesignIcon | SimpleIcon | MomentumIcon;

export type IconPack = 'mdi' | 'si' | 'mom';

export const ICON_PACKS = {
  si: SimpleIcons,
  mdi: MaterialDesignIcons,
  mom: MomentumIcons
};

export const DEFAULT_ICON_PACK = 'mdi';

export * from './icon.component';
export * from './icon.service';
