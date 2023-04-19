import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { GlobalStatsTopsComponent } from './global-stats-tops.component';
import { ThemeModule } from '../../../../../@theme/theme.module';
import { NbStatusService } from '@nebular/theme';

describe('GlobalStatsTopsComponent', () => {
  let component: GlobalStatsTopsComponent;
  let fixture: ComponentFixture<GlobalStatsTopsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [GlobalStatsTopsComponent],
      providers: [NbStatusService],
      imports: [ThemeModule]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GlobalStatsTopsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
