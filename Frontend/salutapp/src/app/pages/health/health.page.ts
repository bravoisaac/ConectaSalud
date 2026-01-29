import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { HealthService } from '../../services/health.service';

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
  selectedProfile: any = null;
  availability: any[] = [];
  availabilityLoading = false;

  bookingProfileId: number | null = null;
  bookingStart = new Date(Date.now() + 3600 * 1000).toISOString();
  bookingEnd = '';

  constructor(private healthService: HealthService) {}

  ngOnInit() {
    this.loadProfiles();
  }

  loadProfiles() {
    this.loading = true;
    this.errorMsg = '';

    this.healthService.listProfiles().subscribe({
      next: (res: any) => {
        this.profiles = res?.data ? res.data : res;
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
    this.availability = [];
    this.availabilityLoading = true;
    this.healthService.getAvailability(profile.id).subscribe({
      next: (res: any) => {
        this.availability = Array.isArray(res) ? res : [];
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

  createBooking() {
    this.successMsg = '';
    this.errorMsg = '';

    if (!this.bookingProfileId) {
      this.errorMsg = 'Selecciona un profesional';
      return;
    }

    this.healthService
      .createBooking(this.bookingProfileId, this.bookingStart, this.bookingEnd || undefined)
      .subscribe({
        next: () => {
          this.successMsg = 'Reserva creada';
        },
        error: () => {
          this.errorMsg = 'No se pudo crear la reserva';
        }
      });
  }
}
