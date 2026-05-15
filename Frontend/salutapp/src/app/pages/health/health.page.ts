import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { regions as clRegions, provinces as clProvinces, communes as clCommunes } from '@clregions/data/array';

import { HealthService } from '../../services/health.service';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-health',
  templateUrl: './health.page.html',
  styleUrls: ['./health.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class HealthPage implements OnInit {
  readonly regions = clRegions;
  readonly provinces = clProvinces;
  readonly communes = clCommunes;
  query = '';
  location = '';
  specialty = '';
  experienceMin = '';
  rateMin = '';
  rateMax = '';
  sortBy = 'name_asc';

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
  bookingRegion = '';
  bookingComuna = '';
  bookingCity = '';
  bookingStreet = '';
  bookingNumber = '';
  bookingLat: number | null = null;
  bookingLng: number | null = null;
  profileAddressLoaded = false;

  get availableBookingCities() {
    const regionId = this.resolveRegionId(this.bookingRegion);
    if (!regionId) {
      return [];
    }
    return this.provinces
      .filter((p: any) => String(p.regionId) === regionId)
      .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));
  }

  get availableBookingComunas() {
    const provinceId = this.resolveProvinceId(this.bookingCity);
    if (!provinceId) {
      return [];
    }
    return this.communes
      .filter((c: any) => String(c.provinceId) === provinceId)
      .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));
  }

  onBookingRegionChange() {
    this.bookingCity = '';
    this.bookingComuna = '';
  }

  onBookingCityChange() {
    this.bookingComuna = '';
  }

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
    private profileService: ProfileService,
  ) {}

  async ngOnInit() {
    await this.loadCurrentUser();
    this.loadMyProfileAddress();
    this.loadProfiles();
  }

  loadMyProfileAddress() {
    this.profileService.getProfile().subscribe({
      next: (res: any) => {
        this.profileAddressLoaded = true;
        const region = String(res?.address_region || '').trim();
        const comuna = String(res?.address_comuna || '').trim();
        const city = String(res?.address_city || '').trim();
        const street = String(res?.address_street || '').trim();
        const number = String(res?.address_number || '').trim();
        if (!this.bookingRegion && region) this.bookingRegion = region;
        if (!this.bookingComuna && comuna) this.bookingComuna = comuna;
        if (!this.bookingCity && city) this.bookingCity = city;
        if (!this.bookingStreet && street) this.bookingStreet = street;
        if (!this.bookingNumber && number) this.bookingNumber = number;
      },
      error: () => {
        this.profileAddressLoaded = true;
      }
    });
  }

  get filteredProfiles() {
    const q = this.query.trim().toLowerCase();
    const locationQuery = this.location.trim().toLowerCase();
    const specialtyQuery = this.specialty.trim().toLowerCase();
    const experienceMin = this.parseNumber(this.experienceMin);
    const rateMin = this.parseNumber(this.rateMin);
    const rateMax = this.parseNumber(this.rateMax);

    const filtered = this.profiles.filter(profile => {
      const haystack = `${this.displayName(profile)} ${profile?.specialty || ''} ${profile?.location || ''}`
        .toLowerCase();

      const matchesQuery = !q || haystack.includes(q);
      const matchesLocation = !locationQuery || String(profile?.location || '').toLowerCase().includes(locationQuery);
      const matchesSpecialty = !specialtyQuery || String(profile?.specialty || '').toLowerCase().includes(specialtyQuery);

      const experience = this.toNumber(profile?.experience_years);
      const rate = this.toNumber(profile?.rate_hour);

      const matchesExperience = experienceMin === null || (experience !== null && experience >= experienceMin);
      const matchesRate = this.matchesRange(rate, rateMin, rateMax);

      return matchesQuery && matchesLocation && matchesSpecialty && matchesExperience && matchesRate;
    });

    return this.sortProfiles(filtered);
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

  initials(text: string) {
    const value = String(text || '').trim();
    if (!value) {
      return 'PR';
    }
    const parts = value.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || value[0] || 'P';
    const second = parts[1]?.[0] || parts[0]?.[1] || '';
    return (first + second).toUpperCase();
  }

  ratingValue(profile: any): number | null {
    const candidates = [
      profile?.rating,
      profile?.avg_rating,
      profile?.avgRating,
      profile?.user?.rating,
      profile?.user?.avg_rating,
    ];
    for (const candidate of candidates) {
      const num = Number(candidate);
      if (Number.isFinite(num) && num > 0) {
        return num;
      }
    }
    return null;
  }

  availabilityDayCodes() {
    const map: Record<number, string> = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 0: 'D' };
    const order: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 0: 7 };
    const days = new Set<number>();
    for (const slot of this.availability || []) {
      const day = Number((slot as any)?.day_of_week);
      if (!Number.isFinite(day)) continue;
      days.add(day);
    }
    return Array.from(days.values())
      .sort((a, b) => (order[a] ?? 99) - (order[b] ?? 99))
      .map(d => map[d] || 'D');
  }

  availabilityWeekStrip() {
    const map: Record<number, string> = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 0: 'D' };
    const availableDays = new Set<number>();
    for (const slot of this.availability || []) {
      const day = Number((slot as any)?.day_of_week);
      if (!Number.isFinite(day)) continue;
      availableDays.add(day);
    }

    const baseDatePart = this.extractDatePart(this.bookingDate || new Date().toISOString());
    const base = baseDatePart ? new Date(`${baseDatePart}T12:00:00`) : new Date();
    const day = base.getDay(); // 0..6 (Dom..Sab)
    const mondayOffset = (day + 6) % 7; // Lunes = 0
    const monday = new Date(base);
    monday.setDate(base.getDate() - mondayOffset);

    const selectedDatePart = this.extractDatePart(this.bookingDate);
    const toDatePart = (d: Date) => {
      const yyyy = d.getFullYear().toString();
      const mm = (d.getMonth() + 1).toString().padStart(2, '0');
      const dd = d.getDate().toString().padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const dow = date.getDay();
      const datePart = toDatePart(date);
      return {
        code: map[dow] || 'D',
        date: date.getDate(),
        enabled: availableDays.has(dow),
        selected: !!selectedDatePart && selectedDatePart === datePart,
      };
    });
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

    const region = this.bookingRegion.trim();
    const comuna = this.bookingComuna.trim();
    const city = this.bookingCity.trim();
    const street = this.bookingStreet.trim();
    const number = this.bookingNumber.trim();
    if (!region || !comuna || !city || !street || !number) {
      this.errorMsg = 'Completa región, comuna, ciudad, calle y número';
      return;
    }
    const address = `${region}, ${city}, ${comuna}, ${street} ${number}`.trim();

    this.healthService
      .createBooking(
        this.bookingProfileId,
        this.bookingStart,
        this.bookingEnd || undefined,
        address,
        region,
        comuna,
        city,
        street,
        number,
        this.bookingLat,
        this.bookingLng
      )
      .subscribe({
        next: () => {
          this.successMsg = 'Reserva creada';
          this.bookingLat = null;
          this.bookingLng = null;
        },
        error: (err: any) => {
          this.errorMsg = this.extractApiError(err);
        }
      });
  }

  useCurrentLocation() {
    this.errorMsg = '';
    if (!navigator.geolocation) {
      this.errorMsg = 'No se puede obtener la ubicación en este dispositivo';
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.bookingLat = pos.coords.latitude;
        this.bookingLng = pos.coords.longitude;
      },
      () => {
        this.errorMsg = 'No se pudo obtener la ubicación';
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  private matchesIdOrName(value: string, id: any, names: string[]) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) {
      return false;
    }
    if (String(id).trim().toLowerCase() === normalized) {
      return true;
    }
    return names.some(n => String(n || '').trim().toLowerCase() === normalized);
  }

  private resolveRegionId(value: any): string | null {
    const raw = String(value || '').trim();
    if (!raw) {
      return null;
    }
    const region = this.regions.find((r: any) =>
      this.matchesIdOrName(raw, r.id, [r.name, r.shortName, r.abbreviation, r.isoCode])
    );
    return region ? String(region.id) : null;
  }

  private resolveProvinceId(value: any): string | null {
    const raw = String(value || '').trim();
    if (!raw) {
      return null;
    }
    const province = this.provinces.find((p: any) =>
      this.matchesIdOrName(raw, p.id, [p.name])
    );
    return province ? String(province.id) : null;
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

  private parseNumber(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    const trimmed = String(value).trim();
    if (!trimmed) {
      return null;
    }
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : null;
  }

  private toNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  private matchesRange(value: number | null, min: number | null, max: number | null) {
    if (min === null && max === null) {
      return true;
    }
    if (value === null) {
      return false;
    }
    if (min !== null && value < min) {
      return false;
    }
    if (max !== null && value > max) {
      return false;
    }
    return true;
  }

  private sortProfiles(profiles: any[]) {
    const sorted = [...profiles];
    switch (this.sortBy) {
      case 'name_desc':
        return sorted.sort((a, b) => this.compareText(this.displayName(b), this.displayName(a)));
      case 'rate_desc':
        return sorted.sort((a, b) => this.compareNumber(b?.rate_hour, a?.rate_hour));
      case 'rate_asc':
        return sorted.sort((a, b) => this.compareNumber(a?.rate_hour, b?.rate_hour));
      case 'experience_desc':
        return sorted.sort((a, b) => this.compareNumber(b?.experience_years, a?.experience_years));
      case 'experience_asc':
        return sorted.sort((a, b) => this.compareNumber(a?.experience_years, b?.experience_years));
      default:
        return sorted.sort((a, b) => this.compareText(this.displayName(a), this.displayName(b)));
    }
  }

  private compareNumber(a: any, b: any) {
    const numA = this.toNumber(a) ?? 0;
    const numB = this.toNumber(b) ?? 0;
    return numA - numB;
  }

  private compareText(a?: string, b?: string) {
    return (a || '').localeCompare(b || '');
  }
}
