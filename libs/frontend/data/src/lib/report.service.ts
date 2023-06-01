import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateReport, Report } from '@momentum/types';
import { HttpService } from './http.service';

@Injectable({ providedIn: 'root' })
export class ReportService {
  constructor(private http: HttpService) {}

  createReport(body: CreateReport): Observable<Report> {
    return this.http.post<Report>('reports', { body });
  }
}
