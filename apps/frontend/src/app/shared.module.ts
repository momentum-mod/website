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
import { NotFoundModule } from './pages/not-found/not-found.module';

@NgModule({
  imports: [
    CommonModule,
    ThemeModule.forRoot(),
    ComponentsModule,
    NotFoundModule,
    DirectivesModule,
    PipesModule,
    NgOptimizedImage,
    NgxEchartsModule.forRoot({ echarts }),
    NgxPaginationModule
  ],
  declarations: [],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ThemeModule,
    ComponentsModule,
    NotFoundModule,
    DirectivesModule,
    PipesModule,
    NgOptimizedImage,
    NgxEchartsModule,
    NgxPaginationModule
  ]
})
export class SharedModule {}
