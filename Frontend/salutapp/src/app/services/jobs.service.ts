import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class JobsService {
  constructor(private http: HttpClient) {}

  list(status?: string) {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get(`${environment.apiBase}/jobs`, { params });
  }

  create(payload: {
    company_id?: number | null;
    title: string;
    description: string;
    location?: string | null;
    modality?: string | null;
    salary_min?: number | null;
    salary_max?: number | null;
    status?: string | null;
    published_at?: string | null;
  }) {
    return this.http.post(`${environment.apiBase}/jobs`, payload);
  }

  get(jobId: number) {
    return this.http.get(`${environment.apiBase}/jobs/${jobId}`);
  }

  apply(jobId: number, coverLetter?: string) {
    return this.http.post(`${environment.apiBase}/jobs/${jobId}/apply`, {
      cover_letter: coverLetter || null,
    });
  }

  myApplications() {
    return this.http.get(`${environment.apiBase}/job-applications`);
  }

  inboxApplications() {
    return this.http.get(`${environment.apiBase}/job-applications/inbox`);
  }

  updateApplication(applicationId: number, status: string) {
    return this.http.put(`${environment.apiBase}/job-applications/${applicationId}`, { status });
  }
}
