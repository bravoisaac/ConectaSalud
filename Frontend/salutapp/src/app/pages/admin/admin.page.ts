import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class AdminPage implements OnInit {
  loadingVerifications = false;
  updatingVerificationId: number | null = null;
  verificationError = '';
  verificationSuccess = '';
  verifications: any[] = [];

  loadingReports = false;
  updatingReportId: number | null = null;
  reportError = '';
  reportSuccess = '';
  reports: any[] = [];

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadVerifications();
    this.loadReports();
  }

  loadVerifications() {
    this.loadingVerifications = true;
    this.verificationError = '';

    this.adminService.listVerifications().subscribe({
      next: (res: any) => {
        this.verifications = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      },
      error: (err: any) => {
        this.verificationError = err?.error?.message || 'No se pudieron cargar las verificaciones';
      },
    }).add(() => {
      this.loadingVerifications = false;
    });
  }

  verificationName(item: any) {
    return item?.user?.name || item?.user?.email || `Usuario #${item?.user_id || '-'}`;
  }

  reviewVerification(item: any, action: 'approve' | 'reject') {
    if (!item?.id || this.updatingVerificationId) {
      return;
    }

    this.updatingVerificationId = Number(item.id);
    this.verificationError = '';
    this.verificationSuccess = '';

    const request = action === 'approve'
      ? this.adminService.approveVerification(Number(item.id))
      : this.adminService.rejectVerification(Number(item.id));

    request.subscribe({
      next: (updated: any) => {
        this.verifications = this.verifications.map(current => current.id === item.id ? { ...current, ...updated } : current);
        this.verificationSuccess = action === 'approve' ? 'Verificacion aprobada' : 'Verificacion rechazada';
      },
      error: (err: any) => {
        this.verificationError = err?.error?.message || 'No se pudo revisar la verificacion';
      },
    }).add(() => {
      this.updatingVerificationId = null;
    });
  }

  loadReports() {
    this.loadingReports = true;
    this.reportError = '';

    this.adminService.listReports().subscribe({
      next: (res: any) => {
        this.reports = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      },
      error: (err: any) => {
        this.reportError = err?.error?.message || 'No se pudieron cargar los reportes';
      },
    }).add(() => {
      this.loadingReports = false;
    });
  }

  reportTitle(report: any) {
    const targetType = report?.target_type || report?.targetType || 'Elemento';
    const targetId = report?.target_id || report?.targetId || '-';
    return `${targetType} #${targetId}`;
  }

  reporterName(report: any) {
    return report?.reporter?.name || report?.reporter?.email || `Usuario #${report?.reporter_id || '-'}`;
  }

  updateReport(report: any, status: 'resolved' | 'dismissed') {
    if (!report?.id || this.updatingReportId) {
      return;
    }

    this.updatingReportId = Number(report.id);
    this.reportError = '';
    this.reportSuccess = '';

    this.adminService.updateReportStatus(Number(report.id), status).subscribe({
      next: (updated: any) => {
        this.reports = this.reports.map(current => current.id === report.id ? { ...current, ...updated } : current);
        this.reportSuccess = status === 'resolved' ? 'Reporte resuelto' : 'Reporte desestimado';
      },
      error: (err: any) => {
        this.reportError = err?.error?.message || 'No se pudo actualizar el reporte';
      },
    }).add(() => {
      this.updatingReportId = null;
    });
  }
}
