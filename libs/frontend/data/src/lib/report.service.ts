import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { env } from '@momentum/frontend/env';
import { Report } from '@momentum/types';

@Injectable({ providedIn: 'root' })
export class ReportService {
  constructor(private http: HttpClient) {}

  createReport(report: object): Observable<Report> {
    return this.http.post<Report>(env.api + '/reports', report);
  }
}
