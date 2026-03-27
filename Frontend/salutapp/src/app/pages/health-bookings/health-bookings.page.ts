import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

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

  constructor(
    private authService: AuthService,
    private healthService: HealthService,
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

  get currentBookings() {
    const currentStatuses = new Set(['requested', 'in_service']);
    return this.bookings.filter(item => currentStatuses.has(this.statusKey(item?.status)));
  }

  get finalizedBookings() {
    const finalizedStatuses = new Set(['completed', 'cancelled']);
    return this.bookings.filter(item => finalizedStatuses.has(this.statusKey(item?.status)));
  }

  bookingUserName(booking: any) {
    return booking?.user?.name || booking?.user?.email || `Usuario #${booking?.user_id || '-'}`;
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

  private updateBooking(booking: any, status: string, okMessage: string) {
    if (!booking?.id || !this.canManageBooking(booking)) {
      return;
    }

    this.updatingId = Number(booking.id);
    this.errorMsg = '';
    this.successMsg = '';

    this.healthService.updateBookingStatus(Number(booking.id), status).subscribe({
      next: (updated: any) => {
        this.bookings = this.bookings.map(item => item.id === booking.id ? { ...item, ...updated } : item);
        this.successMsg = okMessage;
      },
      error: (err: any) => {
        this.errorMsg = err?.error?.message || 'No se pudo actualizar la reserva';
      }
    }).add(() => {
      this.updatingId = null;
    });
  }

  private statusKey(status: string) {
    return String(status || '').toLowerCase();
  }
}
