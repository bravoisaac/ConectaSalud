import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { JobsService } from '../../services/jobs.service';

@Component({
  selector: 'app-jobs',
  templateUrl: './jobs.page.html',
  styleUrls: ['./jobs.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class JobsPage implements OnInit {
  query = '';
  modality = 'todas';
  jobs: any[] = [];
  loading = false;
  errorMsg = '';

  constructor(private jobsService: JobsService) {}

  ngOnInit() {
    this.loadJobs();
  }

  get filteredJobs() {
    const q = this.query.trim().toLowerCase();
    return this.jobs.filter(job => {
      const matchesQuery = !q || `${job.title} ${job.company_name || ''} ${job.location || ''}`
        .toLowerCase()
        .includes(q);
      const matchesModality = this.modality === 'todas' || (job.modality || '').toLowerCase() === this.modality;
      return matchesQuery && matchesModality;
    });
  }

  loadJobs() {
    this.loading = true;
    this.errorMsg = '';

    this.jobsService.list().subscribe({
      next: (res: any) => {
        this.jobs = res?.data ? res.data : res;
      },
      error: () => {
        this.errorMsg = 'No se pudo cargar empleos';
      }
    }).add(() => {
      this.loading = false;
    });
  }
}
