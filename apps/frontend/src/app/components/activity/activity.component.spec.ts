import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivityComponent } from './activity.component';
import { CommonModule } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';

describe('ActivityListComponent', () => {
  let component: ActivityComponent;
  let fixture: ComponentFixture<ActivityComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CommonModule, ThemeModule.forRoot(), RouterTestingModule],
      declarations: [ActivityComponent]
    });

    await TestBed.compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
