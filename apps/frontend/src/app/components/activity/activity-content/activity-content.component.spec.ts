import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivityContentComponent } from './activity-content.component';
import { SharedModule } from '../../../shared.module';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ThemeModule } from '@momentum/frontend/theme';
import { DirectivesModule } from '@momentum/frontend/directives';
import { PipesModule } from '@momentum/frontend/pipes';
import { RouterTestingModule } from '@angular/router/testing';

describe('ActivityContentComponent', () => {
  let component: ActivityContentComponent;
  let fixture: ComponentFixture<ActivityContentComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ThemeModule.forRoot(),
        PipesModule,
        RouterTestingModule
      ],
      declarations: [ActivityContentComponent]
    });

    await TestBed.compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityContentComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
