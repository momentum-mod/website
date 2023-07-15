it.todo('This one is a nightmare to mock...');

// import { ComponentFixture, TestBed } from '@angular/core/testing';
// import { MapEditComponent } from './map-edit.component';
// import { FileUploadComponent } from '../upload-form/file-upload/file-upload.component';
// import { MapCreditsComponent } from '../map-credits/map-credits.component';
// import { MapCreditComponent } from '../map-credits/map-credit/map-credit.component';
// import { UserSearchComponent } from '../../user/user-search/user-search.component';
// import { RouterTestingModule } from '@angular/router/testing';
// import { CookieService } from 'ngx-cookie-service';
// import { HttpClientModule } from '@angular/common/http';
// import {
//   NbAlertModule,
//   NbDialogService,
//   NbFocusMonitor,
//   NbIconLibraries,
//   NbStatusService,
//   NbToastrService
// } from '@nebular/theme';
// import { FocusMonitor } from '@angular/cdk/a11y';
// import {
//   AuthService,
//   LocalUserService,
//   MapsService
// } from '@momentum/frontend/data';
// import { mock, mockDeep } from 'jest-mock-extended';
// import { ThemeModule } from '@momentum/frontend/theme';
// import { Map, User } from '@momentum/types';
// import { PipesModule } from '@momentum/frontend/pipes';
// import { of } from 'rxjs';
//
// describe('MapEditComponent', () => {
//   let component: MapEditComponent;
//   let fixture: ComponentFixture<MapEditComponent>;
//
//   beforeEach(() => {
//     TestBed.configureTestingModule({
//       imports: [
//         RouterTestingModule,
//         ThemeModule,
//         NbAlertModule,
//         HttpClientModule,
//         PipesModule
//       ],
//       declarations: [MapEditComponent],
//       providers: [
//         NbStatusService,
//         { provide: NbIconLibraries, useValue: mockDeep<NbIconLibraries>() },
//         { provide: NbDialogService, useValue: mock<NbDialogService> },
//         { provide: MapsService, useValue: { getMap: () => of(mock<Map>) } },
//         {
//           provide: LocalUserService,
//           useValue: {
//             ...mockDeep<LocalUserService>,
//             getLocal: () => of(mock<User>)
//           }
//         },
//         { provide: NbToastrService, useValue: mock<NbToastrService> },
//         { provide: NbFocusMonitor, useClass: FocusMonitor }
//       ]
//     }).compileComponents();
//   });
//
//   beforeEach(() => {
//     fixture = TestBed.createComponent(MapEditComponent);
//     component = fixture.componentInstance;
//     fixture.detectChanges();
//   });
//
//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });
// });
