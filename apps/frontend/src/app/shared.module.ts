import { CommonModule, NgOptimizedImage } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PipesModule } from '@momentum/frontend/pipes';
import { NgxPaginationModule } from 'ngx-pagination';
import { RouterModule } from '@angular/router';
import { IconComponent } from '@momentum/frontend/icons';
import { CardComponent } from './components/card/card.component';
import { TooltipDirective } from './directives/tooltip.directive';

const MODULES = [
  CommonModule,
  PipesModule,
  NgOptimizedImage,
  NgxPaginationModule,
  RouterModule,
  IconComponent,
  CardComponent
];

const DIRECTIVES = [TooltipDirective];

@NgModule({
  imports: [...MODULES, ...DIRECTIVES],
  exports: [...MODULES, ...DIRECTIVES, FormsModule, ReactiveFormsModule]
})
export class SharedModule {}
