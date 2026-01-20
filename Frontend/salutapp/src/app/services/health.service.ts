import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HealthService {
  constructor(private http: HttpClient) {}

  listProfiles() {
    return this.http.get(`${environment.apiBase}/health/profiles`);
  }

  createBooking(profileId: number, startAt: string, endAt?: string) {
    return this.http.post(`${environment.apiBase}/health/bookings`, {
      health_profile_id: profileId,
      start_at: startAt,
      end_at: endAt || null,
    });
  }
}
