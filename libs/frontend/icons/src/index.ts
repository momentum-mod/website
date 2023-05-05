import { KebabCase, Replace } from 'type-fest';

import * as MaterialDesignIcons from './material-design-icons.icons';
import * as SimpleIcons from './simple-icons.icons';
import * as MomentumIcons from './momentum.icons';

export { MaterialDesignIcons, SimpleIcons, MomentumIcons };

export type Icon =
  | KebabCase<Replace<keyof typeof MaterialDesignIcons, 'mdi', ''>>
  | KebabCase<keyof typeof SimpleIcons>
  | KebabCase<keyof typeof MomentumIcons>;

export type IconPack = 'mdi' | 'si' | 'mom';
