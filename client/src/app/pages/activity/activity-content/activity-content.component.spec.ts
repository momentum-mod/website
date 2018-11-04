import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {ActivityContentComponent} from './activity-content.component';
import {NbUserModule} from '@nebular/theme';
import {Activity_Type} from '../../../@core/models/activity-type.model';

describe('ActivityContentComponent', () => {
  let component: ActivityContentComponent;
  let fixture: ComponentFixture<ActivityContentComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [NbUserModule],
      declarations: [ ActivityContentComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivityContentComponent);
    component = fixture.componentInstance;
    component.activity = {
      id: 1,
      user: {
        id: '1',
        permissions: 0,
        profile: {
          id: '1',
          alias: 'Ninja',
          bio: '',
          avatarURL: '/assets/images/caution.png',
        },
      },
      type: Activity_Type.USER_JOIN,
      data: 'lol',
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
