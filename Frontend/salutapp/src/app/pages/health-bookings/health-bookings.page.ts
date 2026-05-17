import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { AuthService } from '../../services/auth.service';
import { HealthService } from '../../services/health.service';

@Component({
  selector: 'app-health-bookings',
  templateUrl: './health-bookings.page.html',
  styleUrls: ['./health-bookings.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class HealthBookingsPage implements OnInit {
  loading = false;
  updatingId: number | null = null;
  errorMsg = '';
  successMsg = '';
  isHealthUser = false;
  bookings: any[] = [];
  selectedBooking: any = null;

  constructor(
    private authService: AuthService,
    private healthService: HealthService,
    private sanitizer: DomSanitizer,
  ) {}

  async ngOnInit() {
    const user = await this.resolveCurrentUser();
    this.isHealthUser = user?.role === 'health';
    this.loadBookings();
  }

  private async resolveCurrentUser() {
    const storedUser = await this.authService.getUser();
    if (storedUser?.id) {
      return storedUser;
    }
    return new Promise<any>((resolve) => {
      this.authService.me().subscribe({
        next: async (res: any) => {
          if (res?.id) {
            await this.authService.setUser(res);
          }
          resolve(res);
        },
        error: () => resolve(null),
      });
    });
  }

  loadBookings() {
    this.loading = true;
    this.errorMsg = '';

    this.healthService.listBookings().subscribe({
      next: (res: any) => {
        this.bookings = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      },
      error: (err: any) => {
        this.errorMsg = err?.error?.message || `No se pudieron cargar las reservas (${err?.status || 'sin codigo'})`;
      }
    }).add(() => {
      this.loading = false;
    });
  }

  acceptBooking(booking: any) {
    this.updateBooking(booking, 'in_service', 'Reserva aceptada');
  }

  rejectBooking(booking: any) {
    this.updateBooking(booking, 'cancelled', 'Reserva rechazada');
  }

  canManageBooking(booking: any) {
    return this.isHealthUser && String(booking?.status || '').toLowerCase() === 'requested';
  }

  canSeeCounterpartContact(booking: any) {
    const key = this.statusKey(booking?.status);
    return key === 'in_service' || key === 'completed';
  }

  get currentBookings() {
    const currentStatuses = new Set(['requested', 'in_service']);
    return this.bookings.filter(item => currentStatuses.has(this.statusKey(item?.status)));
  }

  get finalizedBookings() {
    const finalizedStatuses = new Set(['completed', 'cancelled']);
    return this.bookings.filter(item => finalizedStatuses.has(this.statusKey(item?.status)));
  }

  private bookingHealthProfile(booking: any) {
    return booking?.health_profile || booking?.healthProfile || null;
  }

  private providerUser(booking: any) {
    return this.bookingHealthProfile(booking)?.user || null;
  }

  counterpartUser(booking: any) {
    if (this.isHealthUser) {
      return booking?.user || null;
    }
    return this.providerUser(booking);
  }

  bookingCounterpartName(booking: any) {
    const user = this.counterpartUser(booking);
    return user?.name || user?.email || `Usuario #${user?.id || '-'}`;
  }

  bookingStatusLabel(status: string) {
    const key = String(status || '').toLowerCase();
    if (key === 'requested') {
      return 'En espera';
    }
    if (key === 'in_service') {
      return 'Aceptada';
    }
    if (key === 'completed') {
      return 'Completada';
    }
    if (key === 'cancelled') {
      return 'Rechazada';
    }
    return status || 'Sin estado';
  }

  bookingBadgeTone(booking: any) {
    const key = this.statusKey(booking?.status);
    if (key === 'in_service') return 'success';
    if (key === 'requested') return 'warning';
    if (key === 'cancelled') return 'danger';
    return 'neutral';
  }

  bookingTitle(booking: any) {
    const specialty = String(this.bookingHealthProfile(booking)?.specialty || '').trim();
    if (specialty) {
      return specialty;
    }
    return 'Cita de salud';
  }

  bookingSubtitle(booking: any) {
    return this.bookingCounterpartName(booking);
  }

  bookingDescription(booking: any) {
    const location = String(this.bookingHealthProfile(booking)?.location || '').trim();
    if (location) {
      return location;
    }
    const { city, comuna } = this.bookingAddressPartsFrom(booking);
    const place = [city, comuna].filter(Boolean).join(', ').trim();
    return place ? `Servicio en ${place}` : '';
  }

  bookingAddressLine(booking: any) {
    const { region, comuna, city, street, number } = this.bookingAddressPartsFrom(booking);
    const parts = [region, city, comuna].filter(Boolean);
    const streetLine = `${street} ${number}`.trim();
    if (streetLine) {
      parts.push(streetLine);
    }
    const formatted = parts.join(', ').trim();
    if (formatted) {
      return formatted;
    }
    return String(booking?.service_address || booking?.serviceAddress || '').trim();
  }

  private bookingAddressPartsFrom(booking: any) {
    const region = String(booking?.service_region || booking?.serviceRegion || '').trim();
    const comuna = String(booking?.service_comuna || booking?.serviceComuna || '').trim();
    const city = String(booking?.service_city || booking?.serviceCity || '').trim();
    const street = String(booking?.service_street || booking?.serviceStreet || '').trim();
    const number = String(booking?.service_number || booking?.serviceNumber || '').trim();
    return { region, comuna, city, street, number };
  }

  bookingDateCompact(booking: any) {
    const raw = booking?.start_at || booking?.startAt || null;
    if (!raw) return '';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '';
    return d;
  }

  private updateBooking(booking: any, status: string, okMessage: string) {
    if (!booking?.id || !this.canManageBooking(booking)) {
      return;
    }

    this.updatingId = Number(booking.id);
    this.errorMsg = '';
    this.successMsg = '';

    this.healthService.updateBookingStatus(Number(booking.id), status).subscribe({
      next: (updated: any) => {
        const merged = { ...booking, ...updated };
        this.bookings = this.bookings.map(item => item.id === booking.id ? merged : item);
        this.successMsg = okMessage;
        if (status === 'in_service') {
          this.openBookingDetails(merged);
        }
      },
      error: (err: any) => {
        this.errorMsg = err?.error?.message || 'No se pudo actualizar la reserva';
      }
    }).add(() => {
      this.updatingId = null;
    });
  }

  openBookingDetails(booking: any) {
    if (!booking) {
      return;
    }
    if (this.isHealthUser) {
      const key = this.statusKey(booking?.status);
      if (key !== 'in_service' && key !== 'completed') {
        return;
      }
    }
    this.selectedBooking = booking;
  }

  closeBookingDetails() {
    this.selectedBooking = null;
  }

  get selectedCounterpartUser() {
    if (!this.selectedBooking) {
      return null;
    }
    return this.counterpartUser(this.selectedBooking);
  }

  get counterpartTitle() {
    return this.isHealthUser ? 'Cliente' : 'Profesional';
  }

  get counterpartSpecialty() {
    if (this.isHealthUser) {
      return '';
    }
    return String(this.bookingHealthProfile(this.selectedBooking)?.specialty || '').trim();
  }

  get bookingAddress() {
    return String(this.selectedBooking?.service_address || this.selectedBooking?.serviceAddress || '').trim();
  }

  get bookingAddressParts() {
    const region = String(this.selectedBooking?.service_region || this.selectedBooking?.serviceRegion || '').trim();
    const comuna = String(this.selectedBooking?.service_comuna || this.selectedBooking?.serviceComuna || '').trim();
    const city = String(this.selectedBooking?.service_city || this.selectedBooking?.serviceCity || '').trim();
    const street = String(this.selectedBooking?.service_street || this.selectedBooking?.serviceStreet || '').trim();
    const number = String(this.selectedBooking?.service_number || this.selectedBooking?.serviceNumber || '').trim();
    return { region, comuna, city, street, number };
  }

  get formattedServiceAddress() {
    const { region, comuna, city, street, number } = this.bookingAddressParts;
    const parts = [region, city, comuna].filter(Boolean);
    const streetLine = `${street} ${number}`.trim();
    if (streetLine) {
      parts.push(streetLine);
    }
    const formatted = parts.join(', ');
    return formatted || this.bookingAddress;
  }

  get mapsLink() {
    const address = this.formattedServiceAddress;
    if (address) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    }
    const lat = this.bookingLat;
    const lng = this.bookingLng;
    if (lat !== null && lng !== null) {
      return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }
    return '';
  }

  get bookingLat(): number | null {
    const raw = this.selectedBooking?.service_lat ?? this.selectedBooking?.serviceLat ?? null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  }

  get bookingLng(): number | null {
    const raw = this.selectedBooking?.service_lng ?? this.selectedBooking?.serviceLng ?? null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  }

  get mapEmbedUrl(): SafeResourceUrl | null {
    const lat = this.bookingLat;
    const lng = this.bookingLng;
    if (lat !== null && lng !== null) {
      const delta = 0.005;
      const left = lng - delta;
      const bottom = lat - delta;
      const right = lng + delta;
      const top = lat + delta;
      const bbox = `${left},${bottom},${right},${top}`;
      const url = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat},${lng}`;
      return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
    return null;
  }

  initials(text: string) {
    const value = String(text || '').trim();
    if (!value) {
      return 'US';
    }
    const parts = value.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || value[0] || 'U';
    const second = parts[1]?.[0] || parts[0]?.[1] || '';
    return (first + second).toUpperCase();
  }

  get counterpartVerified() {
    const raw = this.selectedCounterpartUser?.email_verified_at ?? this.selectedCounterpartUser?.emailVerifiedAt ?? null;
    return !!raw;
  }

  private statusKey(status: string) {
    return String(status || '').toLowerCase();
  }
}
