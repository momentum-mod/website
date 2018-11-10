import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {ActivityListComponent} from './activity-list.component';
import {ActivityContentComponent} from '../..';
import {NbListModule, NbUserModule} from '@nebular/theme';
import {APP_BASE_HREF} from '@angular/common';
import {RouterModule} from '@angular/router';
import {TimeAgoPipe} from 'time-ago-pipe';

describe('ActivityListComponent', () => {
  let component: ActivityListComponent;
  let fixture: ComponentFixture<ActivityListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [NbListModule, NbUserModule, RouterModule.forRoot([])],
      declarations: [ ActivityListComponent, ActivityContentComponent, TimeAgoPipe ],
      providers: [
        { provide: APP_BASE_HREF, useValue: '/' },
      ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
