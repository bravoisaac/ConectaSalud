import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { JobsService } from '../../services/jobs.service';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';

@Component({
  selector: 'app-job-detail',
  templateUrl: './job-detail.page.html',
  styleUrls: ['./job-detail.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, EmptyStateComponent, LoadingStateComponent],
})
export class JobDetailPage implements OnInit {
  job: any = null;
  jobId: number | null = null;
  loading = false;
  applyLoading = false;
  loadingSimilar = false;
  errorMsg = '';
  successMsg = '';
  coverLetter = '';
  similarJobs: any[] = [];
  private readonly clpFormatter = new Intl.NumberFormat('es-CL');
  returnQuery = '';
  returnModality = 'todas';
  returnLocation = '';
  returnSpecialty = '';
  returnSalaryMin = '';
  returnSalaryMax = '';
  returnContract = '';
  returnProfession = '';
  returnSortBy = 'recent';
  returnDateRange = 'any';

  get isPersonalJob() {
    return String(this.job?.company?.verification_status || '').toLowerCase() === 'personal';
  }

  get posterTitle() {
    if (this.isPersonalJob) {
      return 'Particular';
    }
    return this.job?.company?.name || this.job?.company_name || (this.job?.company_id ? `Empresa #${this.job.company_id}` : 'Empresa');
  }

  get companyTrustLabel() {
    const status = String(this.job?.company?.verification_status || '').toLowerCase();
    if (!status || status === 'personal') {
      return '';
    }
    if (status === 'approved') {
      return 'Verificada';
    }
    if (status === 'pending') {
      return 'Pendiente';
    }
    return status;
  }

  get descriptionText() {
    if (!this.job) {
      return 'Sin descripcion';
    }
    const raw = (this.job.description || '').trim();
    const hasOficio = raw.toLowerCase().includes('oficio:');
    const hasUbicacion = raw.toLowerCase().includes('ubicacion:');
    if (raw && (hasOficio || hasUbicacion)) {
      return raw;
    }
    const oficio = this.job.title ? `Oficio: ${this.job.title}` : '';
    const ubicacion = this.job.location ? `Ubicacion: ${this.job.location}` : '';
    const body = raw || 'Sin descripcion';
    return [oficio, ubicacion, body].filter(Boolean).join('\n');
  }

  constructor(
    private jobsService: JobsService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      this.returnQuery = params.get('query') ?? '';
      this.returnModality = this.normalizeModality(params.get('modality'));
      this.returnLocation = params.get('location') ?? '';
      this.returnSpecialty = params.get('specialty') ?? '';
      this.returnSalaryMin = params.get('salaryMin') ?? '';
      this.returnSalaryMax = params.get('salaryMax') ?? '';
      this.returnContract = params.get('contract') ?? '';
      this.returnProfession = params.get('profession') ?? '';
      this.returnSortBy = params.get('sortBy') ?? 'recent';
      this.returnDateRange = params.get('dateRange') ?? 'any';
    });

    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (!id || Number.isNaN(id)) {
        this.jobId = null;
        this.errorMsg = 'Empleo no encontrado';
        return;
      }
      this.jobId = id;
      this.loadJob();
    });
  }

  get canApply() {
    return !!this.job && (this.job.status || 'open') === 'open';
  }

  backToJobs() {
    this.router.navigate(['/app/jobs'], { queryParams: this.buildReturnQueryParams() });
  }

  viewMoreSimilar() {
    this.router.navigate(['/app/jobs'], { queryParams: this.buildSimilarFiltersQueryParams() });
  }

  goToSimilar(job: any) {
    const id = Number(job?.id);
    if (!id || Number.isNaN(id)) {
      return;
    }
    this.router.navigate(['/app/jobs', id], { queryParams: this.buildReturnQueryParams() });
  }

  titleInitials(text: string) {
    const value = String(text || '').trim();
    if (!value) {
      return 'JB';
    }
    const parts = value.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || value[0] || 'J';
    const second = parts[1]?.[0] || parts[0]?.[1] || '';
    return (first + second).toUpperCase();
  }

  formatCLP(value: any) {
    const num = Number(String(value ?? '').replace(/[^\d]/g, ''));
    if (!Number.isFinite(num) || num <= 0) {
      return '$0';
    }
    return `$${this.clpFormatter.format(num)}`;
  }

  salaryText(job: any) {
    const minRaw = job?.salary_min ?? job?.salaryMin ?? null;
    const maxRaw = job?.salary_max ?? job?.salaryMax ?? null;
    const min = this.toNumber(minRaw);
    const max = this.toNumber(maxRaw);

    if (min !== null && max !== null) {
      if (min === max) {
        return `${this.formatCLP(min)} CLP`;
      }
      return `${this.formatCLP(min)} - ${this.formatCLP(max)} CLP`;
    }
    if (min !== null) {
      return `${this.formatCLP(min)} CLP`;
    }
    if (max !== null) {
      return `${this.formatCLP(max)} CLP`;
    }
    return '$0 CLP';
  }

  jobBadgeLabel(job: any) {
    const status = String(job?.status || 'open').toLowerCase();
    if (status === 'open') {
      return 'Activo';
    }
    if (status === 'closed') {
      return 'Cerrado';
    }
    if (status === 'paused') {
      return 'Pausado';
    }
    return status ? status : 'Activo';
  }

  jobBadgeTone(job: any) {
    const status = String(job?.status || 'open').toLowerCase();
    if (status === 'open') {
      return 'success';
    }
    if (status === 'closed') {
      return 'neutral';
    }
    if (status === 'paused') {
      return 'warning';
    }
    return 'info';
  }

  companyInitials() {
    const name = String(this.job?.company?.name || this.job?.company_name || '').trim();
    if (!name) {
      return 'E';
    }
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || 'E';
    const second = (parts[1]?.[0] || parts[0]?.[1] || '').toString();
    return (first + second).toUpperCase();
  }

  loadJob() {
    if (!this.jobId) {
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    this.job = null;
    this.similarJobs = [];

    this.jobsService.get(this.jobId).subscribe({
      next: (res: any) => {
        this.job = res?.data ? res.data : res;
        this.loadSimilarJobs();
      },
      error: () => {
        this.errorMsg = 'No se pudo cargar el empleo';
      }
    }).add(() => {
      this.loading = false;
    });
  }

  private loadSimilarJobs() {
    if (!this.job?.id) {
      return;
    }

    this.loadingSimilar = true;
    this.jobsService.list('open').subscribe({
      next: (res: any) => {
        const jobs = res?.data ? res.data : res;
        const list = Array.isArray(jobs) ? jobs : [];
        this.similarJobs = this.pickSimilarJobs(this.job, list);
      },
      error: () => {
        this.similarJobs = [];
      },
    }).add(() => {
      this.loadingSimilar = false;
    });
  }

  private pickSimilarJobs(current: any, jobs: any[]) {
    const currentId = Number(current?.id);
    const currentTitle = String(current?.title || '').trim();
    const currentLoc = String(current?.location || '').trim();
    const currentModality = String(current?.modality || '').trim().toLowerCase();
    const currentTokens = this.tokenize(currentTitle);
    const currentLocNorm = this.normalizeText(currentLoc);
    const currentSalaryMin = this.toNumber(current?.salary_min);
    const currentSalaryMax = this.toNumber(current?.salary_max);

    const scored = jobs
      .filter((j) => Number(j?.id) !== currentId)
      .map((j) => {
        const title = String(j?.title || '').trim();
        const loc = String(j?.location || '').trim();
        const modality = String(j?.modality || '').trim().toLowerCase();
        const tokens = this.tokenize(title);

        const overlap = tokens.filter((t) => currentTokens.includes(t)).length;
        const titleScore = overlap ? Math.min(6, overlap * 2) : 0;

        const locNorm = this.normalizeText(loc);
        const locationScore = currentLocNorm && locNorm && (locNorm.includes(currentLocNorm) || currentLocNorm.includes(locNorm))
          ? 3
          : 0;

        const modalityScore = currentModality && modality && modality === currentModality ? 2 : 0;

        const salaryScore = this.salaryOverlapScore(currentSalaryMin, currentSalaryMax, this.toNumber(j?.salary_min), this.toNumber(j?.salary_max));

        return { job: j, score: titleScore + locationScore + modalityScore + salaryScore };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const top = scored.slice(0, 3).map((s) => s.job);
    if (top.length >= 3) {
      return top;
    }

    const fallback = jobs
      .filter((j) => Number(j?.id) !== currentId)
      .filter((j) => String(j?.status || 'open').toLowerCase() === 'open')
      .slice(0, 3 - top.length);

    return [...top, ...fallback].slice(0, 3);
  }

  private buildReturnQueryParams() {
    const queryParams: Record<string, string> = {};

    const query = this.returnQuery;
    const modality = this.returnModality;
    if (query) {
      queryParams['query'] = query;
    }
    if (modality !== 'todas') {
      queryParams['modality'] = modality;
    }
    if (this.returnLocation) {
      queryParams['location'] = this.returnLocation;
    }
    if (this.returnProfession) {
      queryParams['profession'] = this.returnProfession;
    }
    if (this.returnSpecialty) {
      queryParams['specialty'] = this.returnSpecialty;
    }
    if (this.returnContract) {
      queryParams['contract'] = this.returnContract;
    }
    if (this.returnSalaryMin) {
      queryParams['salaryMin'] = this.returnSalaryMin;
    }
    if (this.returnSalaryMax) {
      queryParams['salaryMax'] = this.returnSalaryMax;
    }
    if (this.returnSortBy && this.returnSortBy !== 'recent') {
      queryParams['sortBy'] = this.returnSortBy;
    }
    if (this.returnDateRange && this.returnDateRange !== 'any') {
      queryParams['dateRange'] = this.returnDateRange;
    }

    return queryParams;
  }

  private buildSimilarFiltersQueryParams() {
    const queryParams: Record<string, string> = {};
    const modality = this.normalizeModality(this.job?.modality ?? null);
    if (modality !== 'todas') {
      queryParams['modality'] = modality;
    }
    const location = String(this.job?.location || '').trim();
    if (location) {
      queryParams['location'] = location;
    }
    const title = String(this.job?.title || '').trim();
    if (title) {
      queryParams['profession'] = title;
    }
    const salaryMin = this.toNumber(this.job?.salary_min);
    const salaryMax = this.toNumber(this.job?.salary_max);
    if (salaryMin !== null && salaryMin > 0) {
      queryParams['salaryMin'] = String(salaryMin);
    }
    if (salaryMax !== null && salaryMax > 0) {
      queryParams['salaryMax'] = String(salaryMax);
    }
    return queryParams;
  }

  private toNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  private salaryOverlapScore(
    currentMin: number | null,
    currentMax: number | null,
    otherMin: number | null,
    otherMax: number | null
  ) {
    if (currentMin === null && currentMax === null) {
      return 0;
    }
    if (otherMin === null && otherMax === null) {
      return 0;
    }
    const aMin = currentMin ?? currentMax ?? null;
    const aMax = currentMax ?? currentMin ?? null;
    const bMin = otherMin ?? otherMax ?? null;
    const bMax = otherMax ?? otherMin ?? null;
    if (aMin === null || aMax === null || bMin === null || bMax === null) {
      return 0;
    }
    const overlaps = aMax >= bMin && aMin <= bMax;
    return overlaps ? 2 : 0;
  }

  private normalizeText(value: string) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private tokenize(value: string) {
    const text = this.normalizeText(value);
    const raw = text.split(/[^a-z0-9]+/).map((t) => t.trim()).filter(Boolean);
    const stop = new Set(['de', 'la', 'el', 'y', 'en', 'para', 'con', 'sin', 'por', 'del', 'al', 'a', 'o', 'un', 'una']);
    return raw.filter((t) => t.length > 2 && !stop.has(t));
  }

  apply() {
    if (!this.jobId) {
      this.errorMsg = 'Empleo no encontrado';
      return;
    }
    if (!this.canApply) {
      this.errorMsg = 'La oferta no esta disponible';
      return;
    }

    this.applyLoading = true;
    this.errorMsg = '';
    this.successMsg = '';

    const letter = this.coverLetter.trim();

    this.jobsService.apply(this.jobId, letter ? letter : undefined).subscribe({
      next: () => {
        const query = this.returnQuery;
        const modality = this.returnModality;
        const queryParams: Record<string, string> = { applied: '1' };
        if (query) {
          queryParams['query'] = query;
        }
        if (modality !== 'todas') {
          queryParams['modality'] = modality;
        }
        if (this.returnLocation) {
          queryParams['location'] = this.returnLocation;
        }
        if (this.returnProfession) {
          queryParams['profession'] = this.returnProfession;
        }
        if (this.returnSpecialty) {
          queryParams['specialty'] = this.returnSpecialty;
        }
        if (this.returnContract) {
          queryParams['contract'] = this.returnContract;
        }
        if (this.returnSalaryMin) {
          queryParams['salaryMin'] = this.returnSalaryMin;
        }
        if (this.returnSalaryMax) {
          queryParams['salaryMax'] = this.returnSalaryMax;
        }
        if (this.returnSortBy && this.returnSortBy !== 'recent') {
          queryParams['sortBy'] = this.returnSortBy;
        }
        if (this.returnDateRange && this.returnDateRange !== 'any') {
          queryParams['dateRange'] = this.returnDateRange;
        }
        this.router.navigate(['/app/jobs'], { queryParams });
      },
      error: (err: any) => {
        if (err?.status === 422) {
          this.errorMsg = 'La oferta no esta disponible';
          return;
        }
        if (err?.status === 403) {
          this.errorMsg = 'No autorizado para postular';
          return;
        }
        if (err?.status === 409) {
          this.errorMsg = err?.error?.message || 'Ya postulaste a esta oferta';
          return;
        }
        this.errorMsg = 'No se pudo enviar la postulacion';
      }
    }).add(() => {
      this.applyLoading = false;
    });
  }

  private normalizeModality(value: string | null) {
    const normalized = (value || '').toLowerCase();
    if (normalized === 'presencial' || normalized === 'remoto' || normalized === 'todas') {
      return normalized;
    }
    return 'todas';
  }
}
