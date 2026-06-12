import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient) {}

  listVerifications() {
    return this.http.get(`${environment.apiBase}/verifications`);
  }

  approveVerification(id: number) {
    return this.http.put(`${environment.apiBase}/verifications/${id}/approve`, {});
  }

  rejectVerification(id: number) {
    return this.http.put(`${environment.apiBase}/verifications/${id}/reject`, {});
  }

  listReports() {
    return this.http.get(`${environment.apiBase}/reports`);
  }

  updateReportStatus(id: number, status: 'open' | 'resolved' | 'dismissed') {
    return this.http.put(`${environment.apiBase}/reports/${id}`, { status });
  }
}
