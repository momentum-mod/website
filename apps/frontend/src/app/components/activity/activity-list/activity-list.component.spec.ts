import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivityListComponent } from './activity-list.component';
import { CommonModule } from '@angular/common';
import { ThemeModule } from '@momentum/frontend/theme';
import { RouterTestingModule } from '@angular/router/testing';

describe('ActivityListComponent', () => {
  let component: ActivityListComponent;
  let fixture: ComponentFixture<ActivityListComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CommonModule, ThemeModule.forRoot(), RouterTestingModule],
      declarations: [ActivityListComponent]
    });

    await TestBed.compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
