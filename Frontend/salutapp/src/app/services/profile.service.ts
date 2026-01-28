import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  constructor(private http: HttpClient) {}

  getProfile() {
    return this.http.get(`${environment.apiBase}/profile`);
  }

  saveProfile(payload: Record<string, any>, cvFile?: File | null) {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }
      const str = String(value);
      if (!str.trim()) {
        return;
      }
      formData.append(key, str);
    });
    if (cvFile) {
      formData.append('cv_file', cvFile);
    }
    return this.http.post(`${environment.apiBase}/profile`, formData);
  }
}
