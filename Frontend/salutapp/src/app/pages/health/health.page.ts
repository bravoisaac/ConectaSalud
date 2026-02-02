import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { HealthService } from '../../services/health.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-health',
  templateUrl: './health.page.html',
  styleUrls: ['./health.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class HealthPage implements OnInit {
  profiles: any[] = [];
  loading = false;
  errorMsg = '';
  successMsg = '';
  currentUserId: number | null = null;
  selectedProfile: any = null;
  availability: any[] = [];
  availabilityLoading = false;

  bookingProfileId: number | null = null;
  bookingDate = new Date().toISOString();
  bookingStartTime = '08:00';
  bookingEndTime = '09:00';
  bookingStart = '';
  bookingEnd = '';

  isDateEnabled = (isoString: string) => {
    if (!this.availability.length) {
      return false;
    }
    const datePart = this.extractDatePart(isoString);
    if (!datePart) {
      return false;
    }
    const day = this.dayOfWeekFromDatePart(datePart);
    return this.availability.some(slot => Number(slot.day_of_week) === day);
  };

  constructor(
    private healthService: HealthService,
    private authService: AuthService,
  ) {}

  async ngOnInit() {
    await this.loadCurrentUser();
    this.loadProfiles();
  }

  private async loadCurrentUser() {
    const user = await this.authService.getUser();
    const id = Number(user?.id);
    this.currentUserId = Number.isFinite(id) ? id : null;
  }

  loadProfiles() {
    this.loading = true;
    this.errorMsg = '';

    this.healthService.listProfiles().subscribe({
      next: (res: any) => {
        const profiles = res?.data ? res.data : res;
        this.profiles = Array.isArray(profiles)
          ? profiles.filter(item => Number(item?.user_id) !== this.currentUserId)
          : [];
      },
      error: () => {
        this.errorMsg = 'No se pudo cargar profesionales';
      }
    }).add(() => {
      this.loading = false;
    });
  }

  openProfile(profile: any) {
    this.selectedProfile = profile;
    this.bookingProfileId = profile?.id ?? null;
    this.successMsg = '';
    this.errorMsg = '';
    this.availability = [];
    this.availabilityLoading = true;

    this.healthService.getAvailability(profile.id).subscribe({
      next: (res: any) => {
        this.availability = Array.isArray(res) ? res : [];
        this.setDefaultBookingFromAvailability();
      },
      error: () => {
        this.errorMsg = 'No se pudo cargar la disponibilidad';
      }
    }).add(() => {
      this.availabilityLoading = false;
    });
  }

  closeProfile() {
    this.selectedProfile = null;
    this.availability = [];
  }

  displayName(profile: any) {
    return profile?.user?.name || profile?.user?.email || 'Profesional';
  }

  dayLabel(day: number) {
    const labels = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    return labels[day] || 'Dia';
  }

  onBookingDateChange(value: string | null) {
    if (!value) {
      return;
    }
    this.bookingDate = value;
    this.pickDefaultTimesForSelectedDate();
    this.syncBookingIsoFromForm();
    this.ensureBookingFitsAvailability();
  }

  onBookingTimeChange() {
    this.syncBookingIsoFromForm();
    this.ensureBookingFitsAvailability();
  }

  get selectedDaySlots() {
    if (!this.bookingDate) {
      return [];
    }
    const datePart = this.extractDatePart(this.bookingDate);
    if (!datePart) {
      return [];
    }
    const day = this.dayOfWeekFromDatePart(datePart);
    return this.availability.filter(slot => Number(slot.day_of_week) === day);
  }

  get hasSelectedDaySlots() {
    return this.selectedDaySlots.length > 0;
  }

  get selectedDayRangesText() {
    if (!this.selectedDaySlots.length) {
      return 'No hay horarios para el dia elegido';
    }
    return this.selectedDaySlots
      .map(slot => `${this.formatTime(slot.start_time)}-${this.formatTime(slot.end_time)}`)
      .join(', ');
  }

  createBooking() {
    this.successMsg = '';
    this.errorMsg = '';

    if (!this.bookingProfileId) {
      this.errorMsg = 'Selecciona un profesional';
      return;
    }
    if (!this.canBookSelectedProfile) {
      this.errorMsg = 'No puedes reservar tu propio perfil de salud';
      return;
    }

    this.syncBookingIsoFromForm();
    if (!this.ensureBookingFitsAvailability(true)) {
      return;
    }

    this.healthService
      .createBooking(this.bookingProfileId, this.bookingStart, this.bookingEnd || undefined)
      .subscribe({
        next: () => {
          this.successMsg = 'Reserva creada';
        },
        error: (err: any) => {
          this.errorMsg = this.extractApiError(err);
        }
      });
  }

  get canBookSelectedProfile() {
    if (!this.selectedProfile) {
      return false;
    }
    if (!this.currentUserId) {
      return true;
    }
    return Number(this.selectedProfile?.user_id) !== this.currentUserId;
  }

  private setDefaultBookingFromAvailability() {
    if (!this.availability.length) {
      return;
    }
    const now = new Date();
    for (let offset = 0; offset < 14; offset++) {
      const candidate = new Date(now);
      candidate.setDate(now.getDate() + offset);
      const slot = this.availability.find(item => Number(item.day_of_week) === candidate.getDay());
      if (!slot) {
        continue;
      }
      this.bookingDate = candidate.toISOString();
      this.pickDefaultTimesForSelectedDate();
      this.syncBookingIsoFromForm();
      return;
    }
  }

  private pickDefaultTimesForSelectedDate() {
    const slot = this.selectedDaySlots[0];
    if (!slot) {
      return;
    }
    this.bookingStartTime = this.formatTime(slot.start_time);
    const startMinutes = this.toMinutes(this.bookingStartTime);
    const endMinutes = this.toMinutes(this.formatTime(slot.end_time));
    const targetEnd = Math.min(startMinutes + 60, endMinutes);
    const hh = Math.floor(targetEnd / 60).toString().padStart(2, '0');
    const mm = (targetEnd % 60).toString().padStart(2, '0');
    this.bookingEndTime = `${hh}:${mm}`;
  }

  private syncBookingIsoFromForm() {
    const datePart = this.extractDatePart(this.bookingDate);
    if (!datePart) {
      return;
    }
    // Enviar hora local sin zona UTC para evitar desfase con la disponibilidad del profesional.
    this.bookingStart = `${datePart}T${this.bookingStartTime}:00`;
    this.bookingEnd = `${datePart}T${this.bookingEndTime}:00`;
  }

  private ensureBookingFitsAvailability(showError = false) {
    const start = new Date(this.bookingStart);
    const end = new Date(this.bookingEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      if (showError) {
        this.errorMsg = 'Fecha u hora invalida';
      }
      return false;
    }
    if (end <= start) {
      if (showError) {
        this.errorMsg = 'La hora de fin debe ser mayor';
      }
      return false;
    }
    if (
      start.getFullYear() !== end.getFullYear()
      || start.getMonth() !== end.getMonth()
      || start.getDate() !== end.getDate()
    ) {
      if (showError) {
        this.errorMsg = 'La reserva debe ser el mismo dia';
      }
      return false;
    }
    const slots = this.selectedDaySlots;
    if (!slots.length) {
      if (showError) {
        this.errorMsg = 'No hay horarios disponibles para ese dia';
      }
      return false;
    }
    const startMinutes = (start.getHours() * 60) + start.getMinutes();
    const endMinutes = (end.getHours() * 60) + end.getMinutes();
    const fits = slots.some(slot => {
      const slotStart = this.toMinutes(this.formatTime(slot.start_time));
      const slotEnd = this.toMinutes(this.formatTime(slot.end_time));
      return startMinutes >= slotStart && endMinutes <= slotEnd;
    });
    if (!fits) {
      if (showError) {
        this.errorMsg = `Solo puedes reservar en: ${this.selectedDayRangesText}`;
      }
      return false;
    }
    return true;
  }

  private extractDatePart(value: string) {
    if (!value) {
      return '';
    }
    if (value.length >= 10 && value[4] === '-' && value[7] === '-') {
      return value.slice(0, 10);
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      const yyyy = parsed.getFullYear().toString();
      const mm = (parsed.getMonth() + 1).toString().padStart(2, '0');
      const dd = parsed.getDate().toString().padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return '';
  }

  private dayOfWeekFromDatePart(datePart: string) {
    const d = new Date(`${datePart}T12:00:00`);
    return d.getDay();
  }

  private formatTime(value: string) {
    return String(value || '00:00').slice(0, 5);
  }

  private toMinutes(time: string) {
    const [h, m] = time.split(':');
    return (Number(h) * 60) + Number(m);
  }

  private extractApiError(err: any) {
    const apiMessage = err?.error?.message;
    if (apiMessage) {
      return apiMessage;
    }
    const validationErrors = err?.error?.errors;
    if (validationErrors && typeof validationErrors === 'object') {
      const firstField = Object.keys(validationErrors)[0];
      const firstMessage = Array.isArray(validationErrors[firstField])
        ? validationErrors[firstField][0]
        : validationErrors[firstField];
      if (firstMessage) {
        return String(firstMessage);
      }
    }
    return 'No se pudo crear la reserva';
  }
}
