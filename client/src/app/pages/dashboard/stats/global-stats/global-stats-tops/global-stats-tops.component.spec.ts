import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalStatsTopsComponent } from './global-stats-tops.component';
import {ThemeModule} from '../../../../../@theme/theme.module';

describe('GlobalStatsTopsComponent', () => {
  let component: GlobalStatsTopsComponent;
  let fixture: ComponentFixture<GlobalStatsTopsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GlobalStatsTopsComponent ],
      imports: [ThemeModule],
    })
    .compileComponents();
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
