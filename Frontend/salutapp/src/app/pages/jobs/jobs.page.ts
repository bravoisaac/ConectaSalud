import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { JobsService } from '../../services/jobs.service';

@Component({
  selector: 'app-jobs',
  templateUrl: './jobs.page.html',
  styleUrls: ['./jobs.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule],
})
export class JobsPage implements OnInit {
  query = '';
  modality = 'todas';
  location = '';
  specialty = '';
  profession = '';
  contract = '';
  salaryMin = '';
  salaryMax = '';
  sortBy = 'recent';
  dateRange = 'any';
  jobs: any[] = [];
  loading = false;
  errorMsg = '';
  showSuccess = false;

  constructor(
    private jobsService: JobsService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      this.showSuccess = params.get('applied') === '1';
      this.query = params.get('query') ?? '';
      this.modality = this.normalizeModality(params.get('modality'));
      this.location = params.get('location') ?? '';
      this.specialty = params.get('specialty') ?? '';
      this.profession = params.get('profession') ?? '';
      this.contract = params.get('contract') ?? '';
      this.salaryMin = params.get('salaryMin') ?? '';
      this.salaryMax = params.get('salaryMax') ?? '';
      this.sortBy = this.normalizeSort(params.get('sortBy'));
      this.dateRange = this.normalizeDateRange(params.get('dateRange'));
    });
    this.loadJobs();
  }

  get filteredJobs() {
    const q = this.query.trim().toLowerCase();
    const locationQuery = this.location.trim().toLowerCase();
    const specialtyQuery = this.specialty.trim().toLowerCase();
    const professionQuery = this.profession.trim().toLowerCase();
    const contractQuery = this.contract.trim().toLowerCase();
    const salaryMin = this.parseSalary(this.salaryMin);
    const salaryMax = this.parseSalary(this.salaryMax);
    const filtered = this.jobs.filter(job => {
      const matchesQuery = !q || `${job.title} ${job.company_name || ''} ${job.location || ''}`
        .toLowerCase()
        .includes(q);
      const matchesModality = this.modality === 'todas' || (job.modality || '').toLowerCase() === this.modality;
      const matchesLocation = !locationQuery || (job.location || '').toLowerCase().includes(locationQuery);
      const matchesProfession = !professionQuery
        || `${job.title || ''} ${job.description || ''}`.toLowerCase().includes(professionQuery);
      const matchesSpecialty = !specialtyQuery
        || `${job.title || ''} ${job.description || ''}`.toLowerCase().includes(specialtyQuery);
      const matchesContract = !contractQuery
        || `${job.title || ''} ${job.description || ''}`.toLowerCase().includes(contractQuery);
      const matchesSalary = this.matchesSalary(
        this.toNumber(job.salary_min),
        this.toNumber(job.salary_max),
        salaryMin,
        salaryMax
      );
      const matchesDate = this.matchesDateRange(job);
      return matchesQuery
        && matchesModality
        && matchesLocation
        && matchesProfession
        && matchesSpecialty
        && matchesContract
        && matchesSalary
        && matchesDate;
    });
    return this.sortJobs(filtered);
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

  private normalizeModality(value: string | null) {
    const normalized = (value || '').toLowerCase();
    if (normalized === 'presencial' || normalized === 'remoto' || normalized === 'todas') {
      return normalized;
    }
    return 'todas';
  }

  private normalizeSort(value: string | null) {
    const normalized = (value || '').toLowerCase();
    if (normalized === 'recent' || normalized === 'oldest' || normalized === 'salary_desc'
      || normalized === 'salary_asc' || normalized === 'title_asc' || normalized === 'title_desc') {
      return normalized;
    }
    return 'recent';
  }

  private normalizeDateRange(value: string | null) {
    const normalized = (value || '').toLowerCase();
    if (normalized === '7d' || normalized === '30d' || normalized === '90d' || normalized === 'any') {
      return normalized;
    }
    return 'any';
  }

  private parseSalary(value: string | number | null | undefined): number | null {
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
    const normalized = trimmed.replace(/[^\d]/g, '');
    if (!normalized) {
      return null;
    }
    const num = Number(normalized);
    return Number.isFinite(num) ? num : null;
  }

  private toNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  private matchesSalary(
    jobMin: number | null,
    jobMax: number | null,
    filterMin: number | null,
    filterMax: number | null
  ) {
    if (filterMin === null && filterMax === null) {
      return true;
    }
    if (jobMin === null && jobMax === null) {
      return false;
    }
    const rangeMin = jobMin ?? jobMax ?? null;
    const rangeMax = jobMax ?? jobMin ?? null;
    if (rangeMin === null || rangeMax === null) {
      return false;
    }
    if (filterMin !== null && filterMax !== null) {
      return rangeMax >= filterMin && rangeMin <= filterMax;
    }
    if (filterMin !== null) {
      return rangeMax >= filterMin;
    }
    return rangeMin <= (filterMax as number);
  }

  private matchesDateRange(job: any) {
    const threshold = this.getDateThreshold();
    if (!threshold) {
      return true;
    }
    const jobDate = this.getJobDate(job);
    if (!jobDate) {
      return false;
    }
    return jobDate >= threshold;
  }

  private getJobDate(job: any): Date | null {
    const raw = job?.published_at || job?.created_at;
    if (!raw) {
      return null;
    }
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private getDateThreshold(): Date | null {
    if (this.dateRange === 'any') {
      return null;
    }
    const days = this.dateRange === '7d' ? 7 : this.dateRange === '30d' ? 30 : 90;
    const now = new Date();
    const threshold = new Date(now);
    threshold.setDate(now.getDate() - days);
    return threshold;
  }

  private sortJobs(jobs: any[]) {
    const sorted = [...jobs];
    switch (this.sortBy) {
      case 'oldest':
        return sorted.sort((a, b) => this.compareDates(a, b));
      case 'salary_desc':
        return sorted.sort((a, b) => this.compareSalary(b, a));
      case 'salary_asc':
        return sorted.sort((a, b) => this.compareSalary(a, b));
      case 'title_asc':
        return sorted.sort((a, b) => this.compareText(a?.title, b?.title));
      case 'title_desc':
        return sorted.sort((a, b) => this.compareText(b?.title, a?.title));
      default:
        return sorted.sort((a, b) => this.compareDates(b, a));
    }
  }

  private compareDates(a: any, b: any) {
    const dateA = this.getJobDate(a)?.getTime() ?? 0;
    const dateB = this.getJobDate(b)?.getTime() ?? 0;
    return dateA - dateB;
  }

  private compareSalary(a: any, b: any) {
    const salaryA = this.toNumber(a?.salary_max) ?? this.toNumber(a?.salary_min) ?? 0;
    const salaryB = this.toNumber(b?.salary_max) ?? this.toNumber(b?.salary_min) ?? 0;
    return salaryA - salaryB;
  }

  private compareText(a?: string, b?: string) {
    return (a || '').localeCompare(b || '');
  }
}
