import { CommonModule, NgOptimizedImage } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ThemeModule } from '@momentum/frontend/theme';
import { PipesModule } from '@momentum/frontend/pipes';
import { NgxEchartsModule } from 'ngx-echarts';
import * as echarts from 'echarts';
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
  imports: [
    ...MODULES,
    ...DIRECTIVES,
    ThemeModule.forRoot(),
    NgxEchartsModule.forRoot({ echarts })
  ],
  exports: [
    ...MODULES,
    ...DIRECTIVES,
    ThemeModule,
    NgxEchartsModule,
    FormsModule,
    ReactiveFormsModule
  ]
})
export class SharedModule {}
