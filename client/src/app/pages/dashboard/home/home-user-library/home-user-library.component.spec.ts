import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeUserLibraryComponent } from './home-user-library.component';

describe('HomeUserLibraryComponent', () => {
  let component: HomeUserLibraryComponent;
  let fixture: ComponentFixture<HomeUserLibraryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HomeUserLibraryComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeUserLibraryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
