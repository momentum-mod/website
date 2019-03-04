import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {Report} from '../models/report.model';

@Injectable({
  providedIn: 'root',
})
export class ReportService {

  constructor(private http: HttpClient) { }

  createReport(report: object): Observable<Report> {
    return this.http.post<Report>('/api/reports', report);
  }

}
