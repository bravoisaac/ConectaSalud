import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { regions as clRegions, provinces as clProvinces, communes as clCommunes } from '@clregions/data/array';
import { Subscription } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { HealthService } from '../../services/health.service';
import { FontSizeMode, ThemeMode, UiSettings, UiSettingsService } from '../../services/ui-settings.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, FormsModule],
})
export class ProfilePage implements OnInit, OnDestroy {
  readonly regions = clRegions;
  readonly provinces = clProvinces;
  readonly communes = clCommunes;

  user: any = null;
  isAdmin = false;
  isHealthUser = false;
  isPersonalEditMode = false;
  personalDraft = {
    full_name: '',
    email: '',
    phone: '',
    address_region: '',
    address_comuna: '',
    address_city: '',
    address_street: '',
    address_number: '',
  };
  savingPersonal = false;
  personalSuccessMsg = '';
  personalErrorMsg = '';
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
    address: '',
    address_region: '',
    address_comuna: '',
    address_city: '',
    address_street: '',
    address_number: '',
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

  isUiSettingsOpen = false;
  uiSettingsState: UiSettings = {
    themeMode: 'dark',
    fontSize: 'md',
    highContrast: false,
  };
  private uiSettingsSub?: Subscription;

  constructor(
    private auth: AuthService,
    private router: Router,
    private profileService: ProfileService,
    private healthService: HealthService,
    private uiSettings: UiSettingsService
  ) {}

  initials(text: string) {
    const value = String(text || '').trim();
    if (!value) {
      return 'US';
    }
    const parts = value.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || value[0] || 'U';
    const second = parts[1]?.[0] || parts[0]?.[1] || '';
    return (first + second).toUpperCase();
  }

  roleLabel(role: any) {
    const key = String(role || '').toLowerCase();
    if (key === 'admin') return 'Admin';
    if (key === 'company') return 'Empresa';
    if (key === 'health') return 'Salud';
    return 'Usuario';
  }

  get healthHeaderChips() {
    const chips: string[] = [];
    const specialty = String(this.healthProfile?.specialty || '').trim();
    const location = String(this.healthProfile?.location || '').trim();
    const experience = String(this.healthProfile?.experience_years ?? '').trim();
    const rateRaw = String(this.healthProfile?.rate_hour ?? '').trim();

    if (specialty) {
      chips.push(specialty);
    }

    if (experience && experience !== '0') {
      chips.push(`${experience} años`);
    }

    if (rateRaw && rateRaw !== '0') {
      const rateNum = Number(rateRaw);
      const rateText = Number.isFinite(rateNum)
        ? rateNum.toLocaleString('es-CL', { maximumFractionDigits: 0 })
        : rateRaw;
      chips.push(`$${rateText}/hr`);
    }

    if (location) {
      chips.push(location);
    }

    return chips;
  }

  get formattedAddress() {
    const parts = [
      String(this.profile?.address_region || '').trim(),
      String(this.profile?.address_city || '').trim(),
      String(this.profile?.address_comuna || '').trim(),
    ].filter(Boolean);
    const street = String(this.profile?.address_street || '').trim();
    const number = String(this.profile?.address_number || '').trim();
    const streetLine = `${street} ${number}`.trim();
    if (streetLine) {
      parts.push(streetLine);
    }
    return parts.join(', ');
  }

  get availableCities() {
    const regionId = this.resolveRegionId(this.profile?.address_region);
    if (!regionId) {
      return [];
    }
    return this.provinces
      .filter((p: any) => String(p.regionId) === regionId)
      .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));
  }

  get availableComunas() {
    const provinceId = this.resolveProvinceId(this.profile?.address_city);
    if (!provinceId) {
      return [];
    }
    return this.communes
      .filter((c: any) => String(c.provinceId) === provinceId)
      .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));
  }

  onAddressRegionChange() {
    this.profile.address_city = '';
    this.profile.address_comuna = '';
  }

  onAddressCityChange() {
    this.profile.address_comuna = '';
  }

  startPersonalEdit() {
    this.personalDraft = {
      full_name: this.profile.full_name || '',
      email: this.profile.email || '',
      phone: this.profile.phone || '',
      address_region: this.profile.address_region || '',
      address_comuna: this.profile.address_comuna || '',
      address_city: this.profile.address_city || '',
      address_street: this.profile.address_street || '',
      address_number: this.profile.address_number || '',
    };
    this.isPersonalEditMode = true;
    this.personalSuccessMsg = '';
    this.personalErrorMsg = '';
  }

  cancelPersonalEdit() {
    this.profile.full_name = this.personalDraft.full_name;
    this.profile.email = this.personalDraft.email;
    this.profile.phone = this.personalDraft.phone;
    this.profile.address_region = this.personalDraft.address_region;
    this.profile.address_comuna = this.personalDraft.address_comuna;
    this.profile.address_city = this.personalDraft.address_city;
    this.profile.address_street = this.personalDraft.address_street;
    this.profile.address_number = this.personalDraft.address_number;
    this.isPersonalEditMode = false;
    this.personalSuccessMsg = '';
    this.personalErrorMsg = '';
  }

  toggleCvSection() {
    this.isCvSectionCollapsed = !this.isCvSectionCollapsed;
  }

  toggleHealthServiceSection() {
    this.isHealthServiceSectionCollapsed = !this.isHealthServiceSectionCollapsed;
    if (!this.isHealthServiceSectionCollapsed && this.isHealthUser) {
      this.loadHealthServiceProfile();
    }
  }

  openUiSettings() {
    this.isUiSettingsOpen = true;
  }

  closeUiSettings() {
    this.isUiSettingsOpen = false;
  }

  onThemeModeChange(event: any) {
    const value = event?.detail?.value as ThemeMode;
    this.uiSettings.update({ themeMode: value });
  }

  onFontSizeChange(event: any) {
    const value = event?.detail?.value as FontSizeMode;
    this.uiSettings.update({ fontSize: value });
  }

  onHighContrastChange(event: any) {
    const checked = !!event?.detail?.checked;
    this.uiSettings.update({ highContrast: checked });
  }

  get themeModeLabel() {
    const mode = this.uiSettingsState?.themeMode;
    if (mode === 'dark') return 'Oscuro';
    if (mode === 'light') return 'Claro';
    return 'Sistema';
  }

  get fontSizeLabel() {
    const size = this.uiSettingsState?.fontSize;
    if (size === 'sm') return 'Pequeña';
    if (size === 'lg') return 'Grande';
    return 'Normal';
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
        }
      }
    });

    this.uiSettingsSub = this.uiSettings.settings$.subscribe((settings) => {
      this.uiSettingsState = settings;
    });
  }

  ngOnDestroy() {
    this.uiSettingsSub?.unsubscribe();
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

  loadProfile() {
    this.loadingProfile = true;
    this.profileService.getProfile().subscribe({
      next: (res: any) => {
        if (res) {
          this.profile = { ...this.profile, ...res };
          this.cvName = res.cv_filename || '';
        }
        this.normalizeAddressFields();
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

  private normalizeAddressFields() {
    const region = String(this.profile?.address_region || '').trim();
    if (region) {
      const resolvedRegion = this.regions.find((r: any) =>
        this.matchesIdOrName(region, r.id, [r.name, r.shortName, r.abbreviation, r.isoCode])
      );
      if (resolvedRegion) {
        this.profile.address_region = resolvedRegion.name;
      }
    }

    const city = String(this.profile?.address_city || '').trim();
    if (city) {
      const resolvedProvince = this.provinces.find((p: any) =>
        this.matchesIdOrName(city, p.id, [p.name])
      );
      if (resolvedProvince) {
        this.profile.address_city = resolvedProvince.name;
      }
    }

    const comuna = String(this.profile?.address_comuna || '').trim();
    if (comuna) {
      const resolvedCommune = this.communes.find((c: any) =>
        this.matchesIdOrName(comuna, c.id, [c.name])
      );
      if (resolvedCommune) {
        this.profile.address_comuna = resolvedCommune.name;
      }
    }
  }

  private matchesIdOrName(value: string, id: any, names: string[]) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) {
      return false;
    }
    if (String(id).trim().toLowerCase() === normalized) {
      return true;
    }
    return names.some(n => String(n || '').trim().toLowerCase() === normalized);
  }

  private resolveRegionId(value: any): string | null {
    const raw = String(value || '').trim();
    if (!raw) {
      return null;
    }
    const region = this.regions.find((r: any) =>
      this.matchesIdOrName(raw, r.id, [r.name, r.shortName, r.abbreviation, r.isoCode])
    );
    return region ? String(region.id) : null;
  }

  private resolveProvinceId(value: any): string | null {
    const raw = String(value || '').trim();
    if (!raw) {
      return null;
    }
    const province = this.provinces.find((p: any) =>
      this.matchesIdOrName(raw, p.id, [p.name])
    );
    return province ? String(province.id) : null;
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

  savePersonalProfile() {
    this.savingPersonal = true;
    this.personalSuccessMsg = '';
    this.personalErrorMsg = '';

    const payload = {
      full_name: this.profile.full_name,
      email: this.profile.email,
      phone: this.profile.phone,
      address_region: this.profile.address_region,
      address_comuna: this.profile.address_comuna,
      address_city: this.profile.address_city,
      address_street: this.profile.address_street,
      address_number: this.profile.address_number,
    };

    this.profileService.saveProfile(payload).subscribe({
      next: (res: any) => {
        if (res) {
          this.profile = { ...this.profile, ...res };
        }
        this.personalDraft = {
          full_name: this.profile.full_name || '',
          email: this.profile.email || '',
          phone: this.profile.phone || '',
          address_region: this.profile.address_region || '',
          address_comuna: this.profile.address_comuna || '',
          address_city: this.profile.address_city || '',
          address_street: this.profile.address_street || '',
          address_number: this.profile.address_number || '',
        };
        this.personalSuccessMsg = 'Perfil actualizado';
        this.isPersonalEditMode = false;
      },
      error: () => {
        this.personalErrorMsg = 'No se pudo guardar el perfil';
      }
    }).add(() => {
      this.savingPersonal = false;
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

  async logout() {
    await this.auth.clearToken();
    await this.auth.clearUser();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
