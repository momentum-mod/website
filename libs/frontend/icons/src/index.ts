export * from './init-icons';

import { KebabCase, Replace } from 'type-fest';

import * as MaterialDesignIcons from './material-design-icons.icons';
import * as SimpleIcons from './simple-icons.icons';
import * as MomentumIcons from './momentum.icons';

export { MaterialDesignIcons, SimpleIcons, MomentumIcons };

export type SimpleIcon = KebabCase<keyof typeof SimpleIcons>;
export type MaterialDesignIcon = KebabCase<
  Replace<keyof typeof MaterialDesignIcons, 'mdi', ''>
>;
export type MomentumIcon = KebabCase<keyof typeof MomentumIcons>;

export type Icon = MaterialDesignIcon | SimpleIcon | MomentumIcon;

export type IconPack = 'mdi' | 'si' | 'mom';
