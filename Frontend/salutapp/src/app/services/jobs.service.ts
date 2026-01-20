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

  apply(jobId: number, coverLetter?: string) {
    return this.http.post(`${environment.apiBase}/jobs/${jobId}/apply`, {
      cover_letter: coverLetter || null,
    });
  }
}
