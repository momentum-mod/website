import { CommonModule, NgOptimizedImage } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IconComponent } from './icons';
import { CardComponent } from './components';
import { TooltipDirective } from './directives/tooltip.directive';

const SHARED = [
  CommonModule,
  NgOptimizedImage,
  RouterModule,
  IconComponent,
  CardComponent,
  TooltipDirective
];

/**
 * Shared imports used practically everywhere.
 */
@NgModule({
  imports: [...SHARED],
  exports: [...SHARED, FormsModule, ReactiveFormsModule]
})
export class SharedModule {}
