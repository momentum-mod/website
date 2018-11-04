import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileFollowComponent } from './profile-follow.component';

describe('ProfileFollowComponent', () => {
  let component: ProfileFollowComponent;
  let fixture: ComponentFixture<ProfileFollowComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ProfileFollowComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfileFollowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
