import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { HealthService } from '../../services/health.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, FormsModule],
})
export class ProfilePage implements OnInit {
  user: any = null;
  isAdmin = false;
  isHealthUser = false;
  isCvSectionCollapsed = true;
  isHealthServiceSectionCollapsed = true;
  loadingProfile = false;
  savingProfile = false;
  successMsg = '';
  errorMsg = '';
  cvFile: File | null = null;
  cvName = '';
  experienceEditMode = false;
  skillsEditMode = false;
  educationEditMode = false;
  experienceEntries: Array<{
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    description: string;
  }> = [];
  skillsEntries: string[] = [];
  educationEntries: Array<{
    degree: string;
    institution: string;
    completed: boolean;
    startDate: string;
    endDate: string;
  }> = [];
  newExperience = {
    company: '',
    role: '',
    startDate: '',
    endDate: '',
    description: ''
  };
  newSkill = '';
  newEducation = {
    degree: '',
    institution: '',
    completed: false,
    startDate: '',
    endDate: ''
  };
  profile: any = {
    full_name: '',
    email: '',
    phone: '',
    profession: '',
    summary: '',
    experience: '',
    skills: '',
    education: '',
    cv_url: '',
    cv_filename: ''
  };
  healthProfileId: number | null = null;
  savingHealthProfile = false;
  healthSuccessMsg = '';
  healthErrorMsg = '';
  loadingHealthAvailability = false;
  savingHealthAvailability = false;
  healthAvailability: any[] = [];
  loadingHealthBookings = false;
  healthBookings: any[] = [];
  availabilityForm = {
    day_of_week: 1,
    start_time: '08:00',
    end_time: '20:00',
    timezone: 'America/Santiago'
  };
  readonly weekDays = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miercoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sabado' },
    { value: 0, label: 'Domingo' },
  ];
  healthProfile: any = {
    specialty: '',
    experience_years: '',
    rate_hour: '',
    location: '',
    bio: ''
  };

  constructor(
    private auth: AuthService,
    private router: Router,
    private profileService: ProfileService,
    private healthService: HealthService
  ) {}

  toggleCvSection() {
    this.isCvSectionCollapsed = !this.isCvSectionCollapsed;
  }

  toggleHealthServiceSection() {
    this.isHealthServiceSectionCollapsed = !this.isHealthServiceSectionCollapsed;
    if (!this.isHealthServiceSectionCollapsed && this.isHealthUser) {
      this.loadHealthServiceProfile();
    }
  }

  async ngOnInit() {
    const stored = await this.auth.getUser();
    if (stored) {
      this.user = stored;
      this.isAdmin = stored.role === 'admin';
      this.isHealthUser = stored.role === 'health';
      this.applyUserDefaults();
      this.loadProfile();
      if (this.isHealthUser) {
        this.loadHealthServiceProfile();
        this.loadHealthBookings();
      }
      return;
    }

    this.auth.me().subscribe({
      next: async (res: any) => {
        this.user = res;
        this.isAdmin = res?.role === 'admin';
        this.isHealthUser = res?.role === 'health';
        await this.auth.setUser(res);
        this.applyUserDefaults();
        this.loadProfile();
        if (this.isHealthUser) {
          this.loadHealthServiceProfile();
          this.loadHealthBookings();
        }
      }
    });
  }

  loadHealthServiceProfile() {
    if (!this.user?.id) {
      return;
    }
    this.healthErrorMsg = '';
    this.healthService.listProfiles().subscribe({
      next: (res: any) => {
        const profiles = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        const mine = profiles.find((item: any) => {
          const ownerId = item?.user_id ?? item?.user?.id;
          return Number(ownerId) === Number(this.user.id);
        });
        if (!mine) {
          this.healthProfileId = null;
          return;
        }
        this.healthProfileId = mine.id;
        this.healthProfile = {
          specialty: mine.specialty || '',
          experience_years: mine.experience_years ?? '',
          rate_hour: mine.rate_hour ?? '',
          location: mine.location || '',
          bio: mine.bio || ''
        };
        this.loadHealthAvailability();
      },
      error: () => {
        this.healthErrorMsg = 'No se pudo cargar servicio de salud';
      }
    });
  }

  loadHealthAvailability() {
    if (!this.healthProfileId) {
      this.healthAvailability = [];
      return;
    }
    this.loadingHealthAvailability = true;
    this.healthService.getAvailability(this.healthProfileId).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : [];
        this.healthAvailability = list;
      },
      error: () => {
        this.healthErrorMsg = 'No se pudo cargar disponibilidad';
      }
    }).add(() => {
      this.loadingHealthAvailability = false;
    });
  }

  loadHealthBookings() {
    this.loadingHealthBookings = true;
    this.healthErrorMsg = '';
    this.healthService.listBookings().subscribe({
      next: (res: any) => {
        const rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        this.healthBookings = rows;
      },
      error: () => {
        this.healthErrorMsg = 'No se pudieron cargar las reservas';
      }
    }).add(() => {
      this.loadingHealthBookings = false;
    });
  }

  loadProfile() {
    this.loadingProfile = true;
    this.profileService.getProfile().subscribe({
      next: (res: any) => {
        if (res) {
          this.profile = { ...this.profile, ...res };
          this.cvName = res.cv_filename || '';
        }
        this.applyUserDefaults();
        this.hydrateExperienceEntries();
        this.hydrateSkillsEntries();
        this.hydrateEducationEntries();
        this.experienceEditMode = false;
        this.skillsEditMode = false;
        this.educationEditMode = false;
      },
      error: () => {
        this.errorMsg = 'No se pudo cargar el perfil';
      }
    }).add(() => {
      this.loadingProfile = false;
    });
  }

  applyUserDefaults() {
    if (!this.user) {
      return;
    }
    if (!this.profile.full_name) {
      this.profile.full_name = this.user.name || '';
    }
    if (!this.profile.email) {
      this.profile.email = this.user.email || '';
    }
    if (!this.profile.phone) {
      this.profile.phone = this.user.phone || '';
    }
  }

  hydrateExperienceEntries() {
    const raw = this.profile.experience;
    if (!raw) {
      this.experienceEntries = [];
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.experienceEntries = parsed.map(item => ({
          company: item?.company || '',
          role: item?.role || '',
          startDate: item?.startDate || '',
          endDate: item?.endDate || '',
          description: item?.description || ''
        }));
        return;
      }
    } catch {
      // Ignorar, se trata como texto plano.
    }
    this.experienceEntries = [{
      company: '',
      role: '',
      startDate: '',
      endDate: '',
      description: String(raw)
    }];
  }

  hydrateSkillsEntries() {
    const raw = this.profile.skills;
    if (!raw) {
      this.skillsEntries = [];
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.skillsEntries = parsed
          .map(item => String(item || '').trim())
          .filter(item => item);
        return;
      }
    } catch {
      // Ignorar, se trata como texto plano.
    }
    const text = String(raw);
    const parts = text.split(/[\n,]+/).map(item => item.trim()).filter(item => item);
    this.skillsEntries = parts.length ? parts : [text.trim()];
  }

  hydrateEducationEntries() {
    const raw = this.profile.education;
    if (!raw) {
      this.educationEntries = [];
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.educationEntries = parsed.map(item => ({
          degree: item?.degree || '',
          institution: item?.institution || '',
          completed: !!item?.completed,
          startDate: item?.startDate || '',
          endDate: item?.endDate || ''
        }));
        return;
      }
    } catch {
      // Ignorar, se trata como texto plano.
    }
    this.educationEntries = [{
      degree: '',
      institution: '',
      completed: false,
      startDate: '',
      endDate: '',
    }];
  }

  addExperience() {
    const entry = {
      company: this.newExperience.company?.trim() || '',
      role: this.newExperience.role?.trim() || '',
      startDate: this.newExperience.startDate || '',
      endDate: this.newExperience.endDate || '',
      description: this.newExperience.description?.trim() || ''
    };
    if (!entry.company && !entry.role && !entry.startDate && !entry.endDate && !entry.description) {
      return;
    }
    this.experienceEntries = [entry, ...this.experienceEntries];
    this.newExperience = {
      company: '',
      role: '',
      startDate: '',
      endDate: '',
      description: ''
    };
  }

  removeExperience(index: number) {
    this.experienceEntries = this.experienceEntries.filter((_, i) => i !== index);
  }

  toggleExperienceEdit() {
    this.experienceEditMode = !this.experienceEditMode;
    if (!this.experienceEditMode) {
      this.newExperience = {
        company: '',
        role: '',
        startDate: '',
        endDate: '',
        description: ''
      };
      this.hydrateExperienceEntries();
    }
  }

  addSkill() {
    const value = this.newSkill.trim();
    if (!value) {
      return;
    }
    this.skillsEntries = [value, ...this.skillsEntries];
    this.newSkill = '';
  }

  removeSkill(index: number) {
    this.skillsEntries = this.skillsEntries.filter((_, i) => i !== index);
  }

  toggleSkillsEdit() {
    this.skillsEditMode = !this.skillsEditMode;
    if (!this.skillsEditMode) {
      this.newSkill = '';
      this.hydrateSkillsEntries();
    }
  }

  addEducation() {
    const entry = {
      degree: this.newEducation.degree?.trim() || '',
      institution: this.newEducation.institution?.trim() || '',
      completed: !!this.newEducation.completed,
      startDate: this.newEducation.startDate || '',
      endDate: this.newEducation.completed ? (this.newEducation.endDate || '') : ''
    };
    if (!entry.degree && !entry.institution && !entry.startDate && !entry.endDate) {
      return;
    }
    this.educationEntries = [entry, ...this.educationEntries];
    this.newEducation = {
      degree: '',
      institution: '',
      completed: false,
      startDate: '',
      endDate: ''
    };
  }

  removeEducation(index: number) {
    this.educationEntries = this.educationEntries.filter((_, i) => i !== index);
  }

  toggleEducationEdit() {
    this.educationEditMode = !this.educationEditMode;
    if (!this.educationEditMode) {
      this.newEducation = {
        degree: '',
        institution: '',
        completed: false,
        startDate: '',
        endDate: ''
      };
      this.hydrateEducationEntries();
    }
  }

  private buildExperiencePayload() {
    const cleaned = this.experienceEntries
      .map(item => ({
        company: item.company?.trim() || '',
        role: item.role?.trim() || '',
        startDate: item.startDate || '',
        endDate: item.endDate || '',
        description: item.description?.trim() || ''
      }))
      .filter(item => item.company || item.role || item.startDate || item.endDate || item.description);
    return cleaned.length ? JSON.stringify(cleaned) : '';
  }

  private buildSkillsPayload() {
    const cleaned = this.skillsEntries
      .map(item => item.trim())
      .filter(item => item);
    return cleaned.length ? JSON.stringify(cleaned) : '';
  }

  private buildEducationPayload() {
    const cleaned = this.educationEntries
      .map(item => ({
        degree: item.degree?.trim() || '',
        institution: item.institution?.trim() || '',
        completed: !!item.completed,
        startDate: item.startDate || '',
        endDate: item.completed ? (item.endDate || '') : ''
      }))
      .filter(item => item.degree || item.institution || item.startDate || item.endDate);
    return cleaned.length ? JSON.stringify(cleaned) : '';
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];
    if (file.type !== 'application/pdf') {
      this.errorMsg = 'Solo se permite PDF';
      this.cvFile = null;
      this.cvName = '';
      return;
    }
    this.cvFile = file;
    this.cvName = file.name;
  }

  saveProfile() {
    this.savingProfile = true;
    this.successMsg = '';
    this.errorMsg = '';

    const payload = {
      full_name: this.profile.full_name,
      email: this.profile.email,
      phone: this.profile.phone,
      profession: this.profile.profession,
      summary: this.profile.summary,
      experience: this.buildExperiencePayload(),
      skills: this.buildSkillsPayload(),
      education: this.buildEducationPayload()
    };

    this.profileService.saveProfile(payload, this.cvFile).subscribe({
      next: (res: any) => {
        if (res) {
          this.profile = { ...this.profile, ...res };
          this.cvName = res.cv_filename || this.cvName;
        }
        this.cvFile = null;
        this.hydrateExperienceEntries();
        this.hydrateSkillsEntries();
        this.hydrateEducationEntries();
        this.experienceEditMode = false;
        this.skillsEditMode = false;
        this.educationEditMode = false;
        this.successMsg = 'Curriculum guardado';
      },
      error: () => {
        this.errorMsg = 'No se pudo guardar el curriculum';
      }
    }).add(() => {
      this.savingProfile = false;
    });
  }

  saveHealthServiceProfile() {
    this.savingHealthProfile = true;
    this.healthSuccessMsg = '';
    this.healthErrorMsg = '';

    const payload = {
      specialty: String(this.healthProfile.specialty || '').trim(),
      experience_years: this.healthProfile.experience_years !== '' ? Number(this.healthProfile.experience_years) : null,
      rate_hour: this.healthProfile.rate_hour !== '' ? Number(this.healthProfile.rate_hour) : null,
      location: String(this.healthProfile.location || '').trim() || null,
      bio: String(this.healthProfile.bio || '').trim() || null
    };

    if (!payload.specialty) {
      this.healthErrorMsg = 'La profesion/especialidad es obligatoria';
      this.savingHealthProfile = false;
      return;
    }

    const isUpdate = !!this.healthProfileId;
    const request$ = this.healthProfileId
      ? this.healthService.updateProfile(this.healthProfileId, payload)
      : this.healthService.createProfile(payload);

    request$.subscribe({
      next: (res: any) => {
        this.healthProfileId = res?.id ?? this.healthProfileId;
        this.healthSuccessMsg = isUpdate ? 'Servicio de salud actualizado' : 'Servicio de salud creado';
        this.loadHealthAvailability();
      },
      error: (err: any) => {
        this.healthErrorMsg = err?.error?.message || 'No se pudo guardar servicio de salud';
      }
    }).add(() => {
      this.savingHealthProfile = false;
    });
  }

  saveHealthAvailability() {
    if (!this.healthProfileId) {
      this.healthErrorMsg = 'Primero guarda tu servicio de salud';
      return;
    }
    this.healthErrorMsg = '';
    this.healthSuccessMsg = '';

    if (!this.availabilityForm.start_time || !this.availabilityForm.end_time) {
      this.healthErrorMsg = 'Debes indicar hora de inicio y fin';
      return;
    }
    if (this.availabilityForm.end_time <= this.availabilityForm.start_time) {
      this.healthErrorMsg = 'La hora de fin debe ser mayor que la hora de inicio';
      return;
    }

    this.savingHealthAvailability = true;
    this.healthService.createAvailability(this.healthProfileId, {
      day_of_week: Number(this.availabilityForm.day_of_week),
      start_time: this.availabilityForm.start_time,
      end_time: this.availabilityForm.end_time,
      timezone: this.availabilityForm.timezone || 'America/Santiago'
    }).subscribe({
      next: () => {
        this.healthSuccessMsg = 'Disponibilidad agregada';
        this.loadHealthAvailability();
      },
      error: (err: any) => {
        this.healthErrorMsg = err?.error?.message || 'No se pudo guardar disponibilidad';
      }
    }).add(() => {
      this.savingHealthAvailability = false;
    });
  }

  dayName(day: number) {
    return this.weekDays.find(item => item.value === Number(day))?.label || 'Dia';
  }

  bookingUserName(booking: any) {
    return booking?.user?.name || booking?.user?.email || `Usuario #${booking?.user_id || '-'}`;
  }

  bookingStatusLabel(status: string) {
    const key = String(status || '').toLowerCase();
    if (key === 'requested') {
      return 'En espera';
    }
    if (key === 'in_service') {
      return 'Aceptada';
    }
    if (key === 'completed') {
      return 'Completada';
    }
    if (key === 'cancelled') {
      return 'Rechazada';
    }
    return status || 'Sin estado';
  }

  async logout() {
    await this.auth.clearToken();
    await this.auth.clearUser();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
