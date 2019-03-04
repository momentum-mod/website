// import { async, ComponentFixture, TestBed } from '@angular/core/testing';
//
// import { CreateReportDialogComponent } from './create-report-dialog.component';
// import {NbCardModule, NbDialogRef, NbSelectModule} from '@nebular/theme';
// import {FormsModule, ReactiveFormsModule} from '@angular/forms';
// import {ReportService} from '../../../../@core/data/report.service';
// import {of} from 'rxjs';
// import {ReportCategory} from '../../../../@core/models/report-category.model';
// import {ReportType} from '../../../../@core/models/report-type.model';
// import {Report} from '../../../../@core/models/report.model';
// import {ToasterService} from 'angular2-toaster';
//
// describe('CreateReportDialogComponent', () => {
//   let component: CreateReportDialogComponent;
//   let fixture: ComponentFixture<CreateReportDialogComponent>;
//   let reportServiceStub: Partial<ReportService>;
//   let testReport: Report;
//
//   beforeEach(async(() => {
//     this.testReport = {
//       id: 1,
//       data: '1',
//       category: ReportCategory.OTHER,
//       type: ReportType.USER_PROFILE_REPORT,
//       message: 'He make me mad >:( !!!!',
//       resolved: false,
//       resolutionMessage: '',
//     };
//     reportServiceStub = {
//       createReport: () => {
//         return of(this.testReport);
//       },
//     };
//     TestBed.configureTestingModule({
//       imports: [
//         NbCardModule,
//         FormsModule,
//         ReactiveFormsModule,
//         NbSelectModule,
//       ],
//       providers: [
//         { provide: ReportService, useValue: reportServiceStub },
//       ],
//       declarations: [ CreateReportDialogComponent ],
//     })
//     .compileComponents();
//   }));
//
//   beforeEach(() => {
//     fixture = TestBed.createComponent(CreateReportDialogComponent);
//     component = fixture.componentInstance;
//     fixture.detectChanges();
//   });
//
//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });
// });
