import { CommonModule, NgOptimizedImage } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ThemeModule } from '@momentum/frontend/theme';
import { DirectivesModule } from '@momentum/frontend/directives';
import { PipesModule } from '@momentum/frontend/pipes';
import { ComponentsModule } from './components/components.module';
import { NgxEchartsModule } from 'ngx-echarts';
import * as echarts from 'echarts';
import { NgxPaginationModule } from 'ngx-pagination';
import { RouterModule } from '@angular/router';

const MODULES = [
  CommonModule,
  ComponentsModule,
  DirectivesModule,
  PipesModule,
  NgOptimizedImage,
  NgxPaginationModule,
  RouterModule
];

@NgModule({
  imports: [
    ...MODULES,
    ThemeModule.forRoot(),
    NgxEchartsModule.forRoot({ echarts })
  ],
  declarations: [],
  exports: [
    ...MODULES,
    ThemeModule,
    NgxEchartsModule,
    FormsModule,
    ReactiveFormsModule
  ]
})
export class SharedModule {}
