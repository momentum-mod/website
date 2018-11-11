import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeStatsComponent } from './home-stats.component';

describe('HomeStatsComponent', () => {
  let component: HomeStatsComponent;
  let fixture: ComponentFixture<HomeStatsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HomeStatsComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
