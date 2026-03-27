import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { JobsService } from '../../services/jobs.service';

@Component({
  selector: 'app-job-detail',
  templateUrl: './job-detail.page.html',
  styleUrls: ['./job-detail.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class JobDetailPage implements OnInit {
  job: any = null;
  jobId: number | null = null;
  loading = false;
  applyLoading = false;
  errorMsg = '';
  successMsg = '';
  coverLetter = '';
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

  loadJob() {
    if (!this.jobId) {
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    this.job = null;

    this.jobsService.get(this.jobId).subscribe({
      next: (res: any) => {
        this.job = res?.data ? res.data : res;
      },
      error: () => {
        this.errorMsg = 'No se pudo cargar el empleo';
      }
    }).add(() => {
      this.loading = false;
    });
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
