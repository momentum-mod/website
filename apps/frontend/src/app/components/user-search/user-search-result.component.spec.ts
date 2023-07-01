import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { UserSearchResultComponent } from './user-search-result.component';
import { NbListModule, NbThemeModule, NbUserModule } from '@nebular/theme';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DataModule } from '../../../../@core/data/data.module';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('UserSearchComponent', () => {
  let component: UserSearchResultComponent;
  let fixture: ComponentFixture<UserSearchResultComponent>;
  // let httpMock: HttpTestingController;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        NbThemeModule,
        FormsModule,
        ReactiveFormsModule,
        NbUserModule,
        NbListModule,
        DataModule.forRoot(),
        HttpClientTestingModule
      ],
      declarations: [UserSearchResultComponent]
    }).compileComponents();
    // httpMock = getTestBed().get(HttpTestingController);
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UserSearchResultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
