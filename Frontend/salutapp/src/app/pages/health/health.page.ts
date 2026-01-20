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
