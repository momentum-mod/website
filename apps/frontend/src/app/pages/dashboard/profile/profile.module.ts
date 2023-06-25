import { NgModule } from '@angular/core';
import { UserProfileComponent } from './user-profile.component';
import { ProfileEditComponent } from './profile-edit/profile-edit.component';
import { ProfileFollowComponent } from './profile-follow/profile-follow.component';
import { ProfileCreditsComponent } from './profile-credits/profile-credits.component';
import { ProfileRunHistoryComponent } from './profile-run-history/profile-run-history.component';
import { ProfileRoutingModule } from './profile-routing.module';
import { ProfileComponent } from './profile.component';
import { ProfileNotifyEditComponent } from './profile-follow/profile-notify-edit/profile-notify-edit.component';
import { SharedModule } from '../../../shared.module';

@NgModule({
  imports: [SharedModule, ProfileRoutingModule],
  declarations: [
    ProfileComponent,
    UserProfileComponent,
    ProfileEditComponent,
    ProfileFollowComponent,
    ProfileCreditsComponent,
    ProfileRunHistoryComponent,
    ProfileNotifyEditComponent
  ],
  providers: []
})
export class ProfileModule {}
