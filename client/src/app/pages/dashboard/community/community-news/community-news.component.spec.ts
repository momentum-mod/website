import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CommunityNewsComponent } from './community-news.component';

describe('CommunityNewsComponent', () => {
  let component: CommunityNewsComponent;
  let fixture: ComponentFixture<CommunityNewsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CommunityNewsComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CommunityNewsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
