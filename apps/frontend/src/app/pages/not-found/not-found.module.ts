import { NgModule } from '@angular/core';
import { ThemeModule } from '@momentum/frontend/theme';
import { NotFoundDashboardComponent } from './dashboard/not-found-dashboard.component';
import { NotFoundMainComponent } from './main/not-found-main.component';

@NgModule({
  imports: [ThemeModule],
  declarations: [NotFoundDashboardComponent, NotFoundMainComponent],
  exports: [NotFoundDashboardComponent, NotFoundMainComponent]
})
export class NotFoundModule {}
