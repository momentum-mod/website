import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { HomeUserLibraryComponent } from './home-user-library.component';
import { APP_BASE_HREF } from '@angular/common';
import { NbAccordionModule, NbStatusService } from '@nebular/theme';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AuthService } from '../../../../@core/data/auth.service';
import { CookieService } from 'ngx-cookie-service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('HomeUserLibraryComponent', () => {
  let component: HomeUserLibraryComponent;
  let fixture: ComponentFixture<HomeUserLibraryComponent>;

  beforeEach(waitForAsync(() => {
    const authService: Partial<AuthService> = {};
    const cookServ: Partial<CookieService> = {
      check(name: string): boolean {
        return true;
      },
      get(name: string): string {
        return '';
      },
      delete(name: string, path?: string, domain?: string): void {}
    };
    TestBed.configureTestingModule({
      imports: [
        NbAccordionModule,
        BrowserAnimationsModule,
        HttpClientTestingModule
      ],
      declarations: [HomeUserLibraryComponent],
      providers: [
        NbStatusService,
        { provide: APP_BASE_HREF, useValue: '/' },
        { provide: AuthService, useValue: authService },
        { provide: CookieService, useValue: cookServ }
      ]
    }).compileComponents();
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
