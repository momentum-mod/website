
import { UserProfileComponent } from './user-profile.component';
import { NgModule } from '@angular/core';
import { ThemeModule } from '../../../@theme/theme.module';
import { ProfileCardComponent } from '../profile-card/profile-card.component';


@NgModule({
  imports: [
    ThemeModule,
  ],
  declarations: [
    ProfileCardComponent,
    UserProfileComponent,
  ],
  exports: [
    ProfileCardComponent,
    UserProfileComponent,
  ],
  providers: [],
})
export class UserProfileModule {}
