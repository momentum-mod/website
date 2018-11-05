import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {ActivityCardComponent} from './activity-card.component';
import {ActivityService} from '../../../../@core/data/activity.service';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {ActivityContentComponent} from '../..';
import {TimeAgoPipe} from 'time-ago-pipe';
import {NbCardModule, NbListModule, NbUserModule} from '@nebular/theme';
import {RouterModule} from '@angular/router';

describe('ActivityCardComponent', () => {
  let component: ActivityCardComponent;
  let fixture: ComponentFixture<ActivityCardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [NbCardModule, NbListModule, NbUserModule, HttpClientTestingModule, RouterModule ],
      declarations: [ TimeAgoPipe, ActivityCardComponent, ActivityContentComponent ],
      providers: [ActivityService ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
