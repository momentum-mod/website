import {NgModule} from '@angular/core';
import {UserSearchComponent} from './user-search/user-search.component';
import {ThemeModule} from '../../../@theme/theme.module';
import {NbListModule} from '@nebular/theme';

@NgModule({
  imports: [
    ThemeModule,
    NbListModule,
  ],
  declarations: [
    UserSearchComponent,
  ],
  exports: [
    UserSearchComponent,
  ],
})
export class UserModule {}
