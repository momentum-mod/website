import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileCreditsComponent } from './profile-credits.component';

describe('ProfileCreditsComponent', () => {
  let component: ProfileCreditsComponent;
  let fixture: ComponentFixture<ProfileCreditsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ProfileCreditsComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfileCreditsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
