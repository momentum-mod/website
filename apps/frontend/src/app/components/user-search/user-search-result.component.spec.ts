import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { UserSearchResultComponent } from './user-search-result.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SharedModule } from '../../shared.module';
import { LocalUserService } from '@momentum/frontend/data';
import { mock } from 'jest-mock-extended';

describe('UserSearchComponent', () => {
  let component: UserSearchResultComponent;
  let fixture: ComponentFixture<UserSearchResultComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [SharedModule, HttpClientTestingModule],
      declarations: [UserSearchResultComponent],
      providers: [
        { provide: LocalUserService, useValue: mock<LocalUserService>() }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UserSearchResultComponent);
    component = fixture.componentInstance;
    component.user = { id: 1, avatarURL: '', roles: 0 } as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
