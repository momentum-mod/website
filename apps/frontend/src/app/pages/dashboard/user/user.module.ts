import { NgModule } from '@angular/core';
import { UserSearchComponent } from './user-search/user-search.component';
import { SharedModule } from '../../../shared.module';

@NgModule({
  imports: [SharedModule],
  declarations: [UserSearchComponent],
  exports: [UserSearchComponent]
})
export class UserModule {}
