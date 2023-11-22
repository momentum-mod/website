import { NgModule } from '@angular/core';
import { ThemeModule } from '@momentum/frontend/theme';
import { NotFoundComponent } from './not-found.component';

@NgModule({
  imports: [ThemeModule, NotFoundComponent],
  exports: [NotFoundComponent]
})
export class NotFoundModule {}
