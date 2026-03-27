import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CompaniesService {
  constructor(private http: HttpClient) {}

  list() {
    return this.http.get(`${environment.apiBase}/companies`);
  }

  create(payload: { name: string; rut: string; legal_name?: string | null }) {
    return this.http.post(`${environment.apiBase}/companies`, payload);
  }
}
