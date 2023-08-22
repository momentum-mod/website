import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivityContentComponent } from './activity-content.component';
import { PipesModule } from '@momentum/frontend/pipes';
import { RouterTestingModule } from '@angular/router/testing';
import { SharedModule } from '../../../shared.module';

describe('ActivityContentComponent', () => {
  let component: ActivityContentComponent;
  let fixture: ComponentFixture<ActivityContentComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [SharedModule, PipesModule, RouterTestingModule],
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
