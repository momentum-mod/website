import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MapLeaderboardComponent } from './map-leaderboard.component';

describe('MapLeaderboardComponent', () => {
  let component: MapLeaderboardComponent;
  let fixture: ComponentFixture<MapLeaderboardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MapLeaderboardComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MapLeaderboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
