import { NgModule } from '@angular/core';

import { ThemeModule } from '../../@theme/theme.module';
import { ProfileRoutingModule, routedComponents } from './profile-routing.module';

@NgModule({
  imports: [
    ThemeModule,
    ProfileRoutingModule,
  ],
  declarations: [
    ...routedComponents,
  ],
})
export class ProfileModule { }
