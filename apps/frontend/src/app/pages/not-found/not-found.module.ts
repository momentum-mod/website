import { NgModule } from '@angular/core';
import { ThemeModule } from '@momentum/frontend/theme';
import { NotFoundComponent } from './not-found.component';

@NgModule({
  imports: [ThemeModule],
  declarations: [NotFoundComponent],
  exports: [NotFoundComponent]
})
export class NotFoundModule {}
