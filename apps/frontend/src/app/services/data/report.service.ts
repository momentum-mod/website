import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateReport, Report } from '@momentum/constants';
import { HttpService } from './http.service';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private http = inject(HttpService);

  createReport(body: CreateReport): Observable<Report> {
    return this.http.post<Report>('reports', { body });
  }
}
