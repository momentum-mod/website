
import { UserProfileComponent } from './user-profile.component';
import { NgModule } from '@angular/core';
import { ThemeModule } from '../../../@theme/theme.module';
import { ProfileCardComponent } from '../profile-card/profile-card.component';
 import { ProfileInfoComponent } from '../profile-info/profile-info.component';


@NgModule({
  imports: [
    ThemeModule,
  ],
  declarations: [
    ProfileCardComponent,
    UserProfileComponent,
    ProfileInfoComponent,
  ],
  exports: [
    ProfileCardComponent,
    UserProfileComponent,
    ProfileInfoComponent,
  ],
  providers: [],
})
export class UserProfileModule {}
