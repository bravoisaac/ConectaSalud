import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { JobsService } from '../../services/jobs.service';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';

@Component({
  selector: 'app-my-proposals',
  templateUrl: './my-proposals.page.html',
  styleUrls: ['./my-proposals.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule, EmptyStateComponent, LoadingStateComponent],
})
export class MyProposalsPage implements OnInit {
  proposalsSection: 'my' | 'inbox' = 'my';
  canManageInbox = false;
  selectedApplication: any = null;

  myLoading = false;
  myUpdatingId: number | null = null;
  myErrorMsg = '';
  mySuccessMsg = '';
  myApplications: any[] = [];

  inboxLoading = false;
  inboxUpdatingId: number | null = null;
  inboxErrorMsg = '';
  inboxSuccessMsg = '';
  inboxApplications: any[] = [];

  constructor(
    private authService: AuthService,
    private jobsService: JobsService,
    private router: Router,
  ) {}

  async ngOnInit() {
    const user = await this.resolveCurrentUser();
    const role = String(user?.role || '').toLowerCase();
    this.canManageInbox = role === 'admin' || role === 'company' || role === 'user';
    this.proposalsSection = (role === 'admin' || role === 'company') ? 'inbox' : 'my';

    this.loadMyApplications();
    if (this.canManageInbox) {
      this.loadInboxApplications();
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

  loadMyApplications() {
    this.myLoading = true;
    this.myErrorMsg = '';
    this.mySuccessMsg = '';

    this.jobsService.myApplications().subscribe({
      next: (res: any) => {
        this.myApplications = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      },
      error: (err: any) => {
        this.myErrorMsg = err?.error?.message || `No se pudieron cargar las propuestas (${err?.status || 'sin codigo'})`;
      }
    }).add(() => {
      this.myLoading = false;
    });
  }

  loadInboxApplications() {
    this.inboxLoading = true;
    this.inboxErrorMsg = '';
    this.inboxSuccessMsg = '';

    this.jobsService.inboxApplications().subscribe({
      next: (res: any) => {
        this.inboxApplications = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      },
      error: (err: any) => {
        this.inboxErrorMsg = err?.error?.message || `No se pudieron cargar las propuestas recibidas (${err?.status || 'sin codigo'})`;
      }
    }).add(() => {
      this.inboxLoading = false;
    });
  }

  get myCurrent() {
    const current = new Set(['applied', 'offered']);
    return this.myApplications.filter(item => current.has(this.statusKey(item?.status)));
  }

  get myFinalized() {
    const finalized = new Set(['accepted', 'declined', 'rejected']);
    return this.myApplications.filter(item => finalized.has(this.statusKey(item?.status)));
  }

  get inboxCurrent() {
    const current = new Set(['applied', 'offered']);
    return this.inboxApplications.filter(item => current.has(this.statusKey(item?.status)));
  }

  get inboxFinalized() {
    const finalized = new Set(['accepted', 'declined', 'rejected']);
    return this.inboxApplications.filter(item => finalized.has(this.statusKey(item?.status)));
  }

  openApplicantProfile(app: any) {
    this.selectedApplication = app || null;
  }

  closeApplicantProfile() {
    this.selectedApplication = null;
  }

  openApplicationJob(app: any) {
    const jobId = Number(this.applicationJob(app)?.id);
    if (!Number.isFinite(jobId) || jobId <= 0) {
      return;
    }
    this.router.navigate(['/app/jobs', jobId]);
  }

  applicationJob(app: any) {
    return app?.job_post || app?.jobPost || null;
  }

  applicationProfile(app: any) {
    return app?.profile || null;
  }

  applicationHealthProfile(app: any) {
    return app?.health_profile || app?.healthProfile || null;
  }

  cvUrl(app: any) {
    return this.applicationProfile(app)?.cv_url || this.applicationProfile(app)?.cvUrl || '';
  }

  experienceEntries(profile: any) {
    return this.parseJsonArray(profile?.experience);
  }

  skillsEntries(profile: any) {
    return this.parseJsonArray(profile?.skills);
  }

  educationEntries(profile: any) {
    return this.parseJsonArray(profile?.education);
  }

  private parseJsonArray(value: any): any[] {
    if (!value) {
      return [];
    }
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value !== 'string') {
      return [];
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  isPersonalJob(job: any) {
    return String(job?.company?.verification_status || '').toLowerCase() === 'personal';
  }

  posterText(app: any) {
    const job = this.applicationJob(app);
    if (!job) {
      return 'Empleo';
    }
    if (this.isPersonalJob(job)) {
      return 'Particular';
    }
    return job?.company?.name || job?.company_name || (job?.company_id ? `Empresa #${job.company_id}` : 'Empresa');
  }

  myStatusLabel(status: string) {
    const key = this.statusKey(status);
    if (key === 'applied') {
      return 'Postulado';
    }
    if (key === 'offered') {
      return 'Oferta recibida';
    }
    if (key === 'accepted') {
      return 'Oferta aceptada';
    }
    if (key === 'declined') {
      return 'Oferta rechazada';
    }
    if (key === 'rejected') {
      return 'No seleccionado';
    }
    return status || 'Sin estado';
  }

  proposalBadgeLabel(status: string) {
    const key = this.statusKey(status);
    if (key === 'accepted') return 'Aceptada';
    if (key === 'declined' || key === 'rejected') return 'Rechazada';
    return 'Pendiente';
  }

  proposalBadgeTone(status: string) {
    const key = this.statusKey(status);
    if (key === 'accepted') return 'success';
    if (key === 'declined' || key === 'rejected') return 'danger';
    return 'warning';
  }

  proposalCtaLabel(status: string) {
    const key = this.statusKey(status);
    if (key === 'accepted') return 'Contactar';
    return 'Ver detalle';
  }

  timeAgo(app: any) {
    const raw =
      app?.created_at ||
      app?.createdAt ||
      app?.applied_at ||
      app?.appliedAt ||
      app?.updated_at ||
      app?.updatedAt ||
      app?.job_post?.created_at ||
      app?.jobPost?.created_at;

    if (!raw) {
      return '';
    }

    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      return '';
    }

    const diffMs = Date.now() - d.getTime();
    if (!Number.isFinite(diffMs) || diffMs < 0) {
      return '';
    }

    const minutes = Math.floor(diffMs / 60000);
    if (minutes <= 0) return 'recién';
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `hace ${days} días`;
    const months = Math.floor(days / 30);
    if (months < 12) return `hace ${months} mes${months === 1 ? '' : 'es'}`;
    const years = Math.floor(months / 12);
    return `hace ${years} año${years === 1 ? '' : 's'}`;
  }

  inboxStatusLabel(status: string) {
    const key = this.statusKey(status);
    if (key === 'applied') {
      return 'Propuesta recibida';
    }
    if (key === 'offered') {
      return 'Aceptada (oferta enviada)';
    }
    if (key === 'rejected') {
      return 'Rechazada';
    }
    if (key === 'accepted') {
      return 'Aceptada por postulante';
    }
    if (key === 'declined') {
      return 'Rechazada por postulante';
    }
    return status || 'Sin estado';
  }

  canRespondToOffer(app: any) {
    return this.statusKey(app?.status) === 'offered';
  }

  acceptOffer(app: any) {
    this.respondAsApplicant(app, 'accepted', 'Oferta aceptada');
  }

  declineOffer(app: any) {
    this.respondAsApplicant(app, 'declined', 'Oferta rechazada');
  }

  canEmployerRespond(app: any) {
    return this.canManageInbox && this.statusKey(app?.status) === 'applied';
  }

  acceptCandidate(app: any) {
    this.respondAsEmployer(app, 'offered', 'Propuesta aceptada (oferta enviada)');
  }

  rejectCandidate(app: any) {
    this.respondAsEmployer(app, 'rejected', 'Propuesta rechazada');
  }

  private respondAsApplicant(app: any, status: string, okMessage: string) {
    if (!app?.id || !this.canRespondToOffer(app)) {
      return;
    }

    this.myUpdatingId = Number(app.id);
    this.myErrorMsg = '';
    this.mySuccessMsg = '';

    this.jobsService.updateApplication(Number(app.id), status).subscribe({
      next: (updated: any) => {
        this.myApplications = this.myApplications.map(item => item.id === app.id ? { ...item, ...updated } : item);
        this.mySuccessMsg = okMessage;
      },
      error: (err: any) => {
        this.myErrorMsg = err?.error?.message || 'No se pudo responder la oferta';
      }
    }).add(() => {
      this.myUpdatingId = null;
    });
  }

  private respondAsEmployer(app: any, status: string, okMessage: string) {
    if (!app?.id || !this.canEmployerRespond(app)) {
      return;
    }

    this.inboxUpdatingId = Number(app.id);
    this.inboxErrorMsg = '';
    this.inboxSuccessMsg = '';

    this.jobsService.updateApplication(Number(app.id), status).subscribe({
      next: (updated: any) => {
        this.inboxApplications = this.inboxApplications.map(item => item.id === app.id ? { ...item, ...updated } : item);
        this.inboxSuccessMsg = okMessage;
      },
      error: (err: any) => {
        this.inboxErrorMsg = err?.error?.message || 'No se pudo responder la propuesta';
      }
    }).add(() => {
      this.inboxUpdatingId = null;
    });
  }

  private statusKey(status: string) {
    return String(status || '').toLowerCase();
  }
}
