import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import {ActivityListComponent} from './activity-list.component';
import {ActivityContentComponent} from '../..';
import {NbListModule, NbUserModule, NbLayoutScrollService, NbLayoutRulerService} from '@nebular/theme';
import {APP_BASE_HREF} from '@angular/common';
import {RouterModule} from '@angular/router';
import {TimeagoModule} from 'ngx-timeago';

describe('ActivityListComponent', () => {
  let component: ActivityListComponent;
  let fixture: ComponentFixture<ActivityListComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [NbListModule, NbUserModule, RouterModule.forRoot([], { relativeLinkResolution: 'legacy' }), TimeagoModule.forRoot()],
      declarations: [ ActivityListComponent, ActivityContentComponent ],
      providers: [
        { provide: APP_BASE_HREF, useValue: '/' },
        NbLayoutScrollService,
        NbLayoutRulerService,
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
