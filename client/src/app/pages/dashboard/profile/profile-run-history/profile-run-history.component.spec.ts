import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileRunHistoryComponent } from './profile-run-history.component';

describe('ProfileRunHistoryComponent', () => {
  let component: ProfileRunHistoryComponent;
  let fixture: ComponentFixture<ProfileRunHistoryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ProfileRunHistoryComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfileRunHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
