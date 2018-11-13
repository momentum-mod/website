import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalStatsComponent } from './global-stats.component';

describe('GlobalStatsComponent', () => {
  let component: GlobalStatsComponent;
  let fixture: ComponentFixture<GlobalStatsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GlobalStatsComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GlobalStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
