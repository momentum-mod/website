import { CommonModule, NgOptimizedImage } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ThemeModule } from '@momentum/frontend/theme';
import { PipesModule } from '@momentum/frontend/pipes';
import { NgxEchartsModule } from 'ngx-echarts';
import * as echarts from 'echarts';
import { NgxPaginationModule } from 'ngx-pagination';
import { RouterModule } from '@angular/router';

const MODULES = [
  CommonModule,
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
