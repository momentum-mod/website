import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CommunityActivityComponent } from './community-activity.component';

describe('CommunityActivityComponent', () => {
  let component: CommunityActivityComponent;
  let fixture: ComponentFixture<CommunityActivityComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CommunityActivityComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CommunityActivityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
