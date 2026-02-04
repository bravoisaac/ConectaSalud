import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HealthService {
  constructor(private http: HttpClient) {}

  listProfiles() {
    return this.http.get(`${environment.apiBase}/health/profiles`);
  }

  createProfile(payload: {
    specialty: string;
    experience_years?: number | null;
    rate_hour?: number | null;
    location?: string | null;
    bio?: string | null;
  }) {
    return this.http.post(`${environment.apiBase}/health/profiles`, payload);
  }

  updateProfile(profileId: number, payload: {
    specialty?: string;
    experience_years?: number | null;
    rate_hour?: number | null;
    location?: string | null;
    bio?: string | null;
  }) {
    return this.http.put(`${environment.apiBase}/health/profiles/${profileId}`, payload);
  }

  getAvailability(profileId: number) {
    return this.http.get(`${environment.apiBase}/health/profiles/${profileId}/availability`);
  }

  createAvailability(profileId: number, payload: {
    day_of_week: number;
    start_time: string;
    end_time: string;
    timezone?: string;
  }) {
    return this.http.post(`${environment.apiBase}/health/profiles/${profileId}/availability`, payload);
  }

  createBooking(profileId: number, startAt: string, endAt?: string) {
    return this.http.post(`${environment.apiBase}/health/bookings`, {
      health_profile_id: profileId,
      start_at: startAt,
      end_at: endAt || null,
    });
  }

  listBookings() {
    return this.http.get(`${environment.apiBase}/health/bookings`);
  }

  updateBookingStatus(bookingId: number, status: string) {
    return this.http.put(`${environment.apiBase}/health/bookings/${bookingId}`, { status });
  }
}
