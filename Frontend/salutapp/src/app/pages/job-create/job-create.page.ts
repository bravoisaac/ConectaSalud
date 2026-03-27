import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { AuthService } from '../../services/auth.service';
import { JobsService } from '../../services/jobs.service';
import { CompaniesService } from '../../services/companies.service';

@Component({
  selector: 'app-job-create',
  templateUrl: './job-create.page.html',
  styleUrls: ['./job-create.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule],
})
export class JobCreatePage implements OnInit {
  currentUser: any = null;
  canCreateJob = false;
  postType: 'personal' | 'company' = 'personal';
  showCompanyMode = false;
  loadingCompanies = false;
  saving = false;
  errorMsg = '';
  creatingCompany = false;
  companyErrorMsg = '';

  companies: any[] = [];
  companyId: number | null = null;

  title = '';
  description = '';
  location = '';
  modality = '';
  salaryMin = '';
  salaryMax = '';

  companyName = '';
  companyRut = '';
  companyLegalName = '';

  constructor(
    private authService: AuthService,
    private jobsService: JobsService,
    private companiesService: CompaniesService,
    private router: Router,
  ) {}

  async ngOnInit() {
    const user = await this.resolveCurrentUser();
    this.currentUser = user;
    const role = String(user?.role || '').toLowerCase();
    this.canCreateJob = role === 'company' || role === 'admin' || role === 'user';
    this.showCompanyMode = role === 'admin' || role === 'user';
    this.postType = role === 'company' ? 'company' : 'personal';

    if (this.canCreateJob) {
      this.loadCompanies(user);
    } else {
      this.errorMsg = 'Tu cuenta no tiene permisos para publicar empleos.';
    }
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

  loadCompanies(currentUser: any = this.currentUser) {
    if (!currentUser) {
      this.companies = [];
      this.companyId = null;
      return;
    }
    this.loadingCompanies = true;
    this.errorMsg = '';

    const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';
    const userId = Number(currentUser?.id);

    this.companiesService.list().subscribe({
      next: (res: any) => {
        const rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        const visible = isAdmin ? rows : rows.filter((c: any) => Number(c?.user_id) === userId);
        // Excluir la empresa "personal" (se crea automáticamente para publicaciones particulares).
        this.companies = visible.filter((c: any) => String(c?.verification_status || '').toLowerCase() !== 'personal');
        this.companyId = this.companies.length ? Number(this.companies[0]?.id) : null;
      },
      error: (err: any) => {
        this.errorMsg = err?.error?.message || 'No se pudieron cargar las empresas';
        this.companies = [];
        this.companyId = null;
      }
    }).add(() => {
      this.loadingCompanies = false;
    });
  }

  createCompany() {
    if (!this.canCreateJob) {
      return;
    }

    this.companyErrorMsg = '';
    const name = this.companyName.trim();
    const rut = this.companyRut.trim();
    const legalName = this.companyLegalName.trim();

    if (!name) {
      this.companyErrorMsg = 'El nombre de la empresa es obligatorio';
      return;
    }
    if (!rut) {
      this.companyErrorMsg = 'El RUT es obligatorio';
      return;
    }

    this.creatingCompany = true;
    this.companiesService.create({
      name,
      rut,
      legal_name: legalName || null,
    }).subscribe({
      next: () => {
        this.companyName = '';
        this.companyRut = '';
        this.companyLegalName = '';
        this.loadCompanies();
      },
      error: (err: any) => {
        this.companyErrorMsg = err?.error?.message || 'No se pudo crear la empresa';
      }
    }).add(() => {
      this.creatingCompany = false;
    });
  }

  createJob() {
    if (!this.canCreateJob) {
      return;
    }

    this.errorMsg = '';
    const title = this.title.trim();
    const description = this.description.trim();

    const requiresCompany = this.postType === 'company';
    if (requiresCompany && !this.companyId) {
      this.errorMsg = 'Selecciona una empresa';
      return;
    }
    if (!title) {
      this.errorMsg = 'El titulo es obligatorio';
      return;
    }
    if (!description) {
      this.errorMsg = 'La descripcion es obligatoria';
      return;
    }

    const payload: any = {
      title,
      description,
      location: this.location.trim() || null,
      modality: this.modality.trim() || null,
      salary_min: this.parseNumber(this.salaryMin),
      salary_max: this.parseNumber(this.salaryMax),
    };

    if (requiresCompany) {
      payload.company_id = Number(this.companyId);
    }

    this.saving = true;
    this.jobsService.create(payload).subscribe({
      next: () => {
        this.router.navigate(['/app/jobs'], { queryParams: { created: '1' } });
      },
      error: (err: any) => {
        this.errorMsg = err?.error?.message || 'No se pudo crear el empleo';
      }
    }).add(() => {
      this.saving = false;
    });
  }

  private parseNumber(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = String(value).trim();
    if (!trimmed) {
      return null;
    }
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : null;
  }
}
