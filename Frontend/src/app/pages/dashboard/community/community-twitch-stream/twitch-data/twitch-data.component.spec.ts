import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TwitchDataComponent } from './twitch-data.component';

describe('TwitchDataComponent', () => {
  let component: TwitchDataComponent;
  let fixture: ComponentFixture<TwitchDataComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TwitchDataComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TwitchDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
