import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalStatsBaseComponent } from './global-stats-base.component';
import {ThemeModule} from '../../../../../@theme/theme.module';

describe('GlobalStatsBaseComponent', () => {
  let component: GlobalStatsBaseComponent;
  let fixture: ComponentFixture<GlobalStatsBaseComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ThemeModule],
      declarations: [ GlobalStatsBaseComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GlobalStatsBaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
