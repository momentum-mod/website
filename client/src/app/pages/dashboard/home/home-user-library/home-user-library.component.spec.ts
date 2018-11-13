import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {HomeUserLibraryComponent} from './home-user-library.component';
import {APP_BASE_HREF} from '@angular/common';
import {NbAccordionModule} from '@nebular/theme';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

describe('HomeUserLibraryComponent', () => {
  let component: HomeUserLibraryComponent;
  let fixture: ComponentFixture<HomeUserLibraryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [NbAccordionModule, BrowserAnimationsModule ],
      declarations: [ HomeUserLibraryComponent ],
      providers: [
        { provide: APP_BASE_HREF, useValue: '/' },
      ],
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
