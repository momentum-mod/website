import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalStatsFilterComponent } from './global-stats-filter.component';

describe('GlobalStatsFilterComponent', () => {
  let component: GlobalStatsFilterComponent;
  let fixture: ComponentFixture<GlobalStatsFilterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GlobalStatsFilterComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GlobalStatsFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
