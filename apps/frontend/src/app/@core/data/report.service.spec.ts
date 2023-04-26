// import {TestBed} from '@angular/core/testing';

import { ReportService } from './report.service';
import { Reports } from '../models/reports.model';
import { ReportCategory } from '../models/report-category.model';
import { ReportType } from '../models/report-type.model';

let httpClientSpy: { get: jasmine.Spy; patch: jasmine.Spy; post: jasmine.Spy };
let reportService: ReportService;
let expectedReports: Reports;

describe('ReportService', () => {
  beforeEach(() => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', [
      'get',
      'patch',
      'post'
    ]);
    reportService = new ReportService(<any>httpClientSpy);
    expectedReports = {
      count: 2,
      reports: [
        {
          id: 1,
          data: '1',
          category: ReportCategory.OTHER,
          type: ReportType.USER_PROFILE_REPORT,
          message: 'He make me mad >:( !!!!',
          resolved: false,
          resolutionMessage: ''
        }
      ]
    };
  });

  // TODO: tests
  // it('should be created', () => {
  //   const service: ReportService = TestBed.get(ReportService);
  //   expect(service).toBeTruthy();
  // });
});
