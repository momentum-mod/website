import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeUserMapsComponent } from './home-user-maps.component';

describe('HomeUserMapsComponent', () => {
  let component: HomeUserMapsComponent;
  let fixture: ComponentFixture<HomeUserMapsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HomeUserMapsComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeUserMapsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
