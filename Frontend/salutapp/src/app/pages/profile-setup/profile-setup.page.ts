import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { regions as clRegions, provinces as clProvinces, communes as clCommunes } from '@clregions/data/array';

import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { ProfileCompletionService, ProfileCompletionStatus } from '../../services/profile-completion.service';

type SetupStep = 'personal' | 'professional' | 'documents';

@Component({
  selector: 'app-profile-setup',
  templateUrl: './profile-setup.page.html',
  styleUrls: ['./profile-setup.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule],
})
export class ProfileSetupPage implements OnInit {
  readonly regions = clRegions;
  readonly provinces = clProvinces;
  readonly communes = clCommunes;
  readonly profileSelectOptions = {
    cssClass: 'profile-select-popover',
  };

  user: any = null;
  profile: any = {
    full_name: '',
    email: '',
    phone: '',
    address_region: '',
    address_city: '',
    address_comuna: '',
    address_street: '',
    address_number: '',
    profession: '',
    summary: '',
    experience: '',
    skills: '',
    education: '',
    cv_url: '',
    cv_filename: '',
  };

  loading = false;
  savingPersonal = false;
  savingProfessional = false;
  activeStep: SetupStep = 'personal';
  returnUrl = '/app/jobs';
  successMsg = '';
  errorMsg = '';
  cvFile: File | null = null;
  cvName = '';
  newSkill = '';

  completion: ProfileCompletionStatus = {
    personalComplete: false,
    professionalComplete: false,
    complete: false,
    missingPersonal: [],
    missingProfessional: [],
  };

  experienceEntries: Array<{
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    description: string;
  }> = [];

  educationEntries: Array<{
    degree: string;
    institution: string;
    completed: boolean;
    startDate: string;
    endDate: string;
  }> = [];

  skillsEntries: string[] = [];

  newExperience = {
    company: '',
    role: '',
    startDate: '',
    endDate: '',
    description: '',
  };

  newEducation = {
    degree: '',
    institution: '',
    completed: false,
    startDate: '',
    endDate: '',
  };

  constructor(
    private auth: AuthService,
    private profileService: ProfileService,
    private profileCompletion: ProfileCompletionService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit() {
    this.returnUrl = this.safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
    await this.loadProfile();
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

  get missingSummary() {
    return [...this.completion.missingPersonal, ...this.completion.missingProfessional];
  }

  selectStep(step: SetupStep) {
    this.activeStep = step;
  }

  onAddressRegionChange() {
    this.profile.address_city = '';
    this.profile.address_comuna = '';
    this.refreshCompletion();
  }

  onAddressCityChange() {
    this.profile.address_comuna = '';
    this.refreshCompletion();
  }

  async loadProfile() {
    this.loading = true;
    this.errorMsg = '';

    this.user = await this.auth.getUser();
    this.applyUserDefaults();

    try {
      const res: any = await firstValueFrom(this.profileService.getProfile());
      if (res) {
        this.profile = { ...this.profile, ...res };
        this.cvName = res.cv_filename || '';
      }
    } catch (err: any) {
      if (err?.status !== 404) {
        this.errorMsg = 'No se pudo cargar tu perfil';
      }
    }

    this.normalizeAddressFields();
    this.applyUserDefaults();
    this.hydrateExperienceEntries();
    this.hydrateSkillsEntries();
    this.hydrateEducationEntries();
    this.refreshCompletion();
    this.loading = false;
  }

  async savePersonal() {
    this.savingPersonal = true;
    this.successMsg = '';
    this.errorMsg = '';

    const payload = {
      full_name: this.profile.full_name,
      email: this.profile.email,
      phone: this.profile.phone,
      address_region: this.profile.address_region,
      address_city: this.profile.address_city,
      address_comuna: this.profile.address_comuna,
      address_street: this.profile.address_street,
      address_number: this.profile.address_number,
    };

    try {
      const res: any = await firstValueFrom(this.profileService.saveProfile(payload));
      if (res) {
        this.profile = { ...this.profile, ...res };
      }
      this.successMsg = 'Datos personales guardados';
      this.activeStep = 'professional';
    } catch {
      this.errorMsg = 'No se pudieron guardar los datos personales';
    }

    this.refreshCompletion();
    this.savingPersonal = false;
  }

  async saveProfessional() {
    this.savingProfessional = true;
    this.successMsg = '';
    this.errorMsg = '';
    this.absorbPendingProfessionalEntries();

    const payload = {
      profession: this.profile.profession,
      summary: this.profile.summary,
      experience: this.buildExperiencePayload(),
      skills: this.buildSkillsPayload(),
      education: this.buildEducationPayload(),
    };

    try {
      const res: any = await firstValueFrom(this.profileService.saveProfile(payload, this.cvFile));
      if (res) {
        this.profile = { ...this.profile, ...res };
        this.cvName = res.cv_filename || this.cvName;
      }
      this.profile.experience = payload.experience;
      this.profile.skills = payload.skills;
      this.profile.education = payload.education;
      this.cvFile = null;
      this.successMsg = 'Curriculum profesional guardado';
      this.activeStep = 'documents';
    } catch {
      this.errorMsg = 'No se pudo guardar el curriculum profesional';
    }

    this.refreshCompletion();
    this.savingProfessional = false;
  }

  addExperience() {
    const entry = {
      company: this.newExperience.company.trim(),
      role: this.newExperience.role.trim(),
      startDate: this.newExperience.startDate,
      endDate: this.newExperience.endDate,
      description: this.newExperience.description.trim(),
    };
    if (!entry.company && !entry.role && !entry.startDate && !entry.endDate && !entry.description) {
      return;
    }
    this.experienceEntries = [entry, ...this.experienceEntries];
    this.newExperience = { company: '', role: '', startDate: '', endDate: '', description: '' };
    this.refreshCompletion();
  }

  removeExperience(index: number) {
    this.experienceEntries = this.experienceEntries.filter((_, i) => i !== index);
    this.refreshCompletion();
  }

  addSkill() {
    const value = this.newSkill.trim();
    if (!value) {
      return;
    }
    this.skillsEntries = [value, ...this.skillsEntries];
    this.newSkill = '';
    this.refreshCompletion();
  }

  removeSkill(index: number) {
    this.skillsEntries = this.skillsEntries.filter((_, i) => i !== index);
    this.refreshCompletion();
  }

  addEducation() {
    const entry = {
      degree: this.newEducation.degree.trim(),
      institution: this.newEducation.institution.trim(),
      completed: !!this.newEducation.completed,
      startDate: this.newEducation.startDate,
      endDate: this.newEducation.completed ? this.newEducation.endDate : '',
    };
    if (!entry.degree && !entry.institution && !entry.startDate && !entry.endDate) {
      return;
    }
    this.educationEntries = [entry, ...this.educationEntries];
    this.newEducation = { degree: '', institution: '', completed: false, startDate: '', endDate: '' };
    this.refreshCompletion();
  }

  removeEducation(index: number) {
    this.educationEntries = this.educationEntries.filter((_, i) => i !== index);
    this.refreshCompletion();
  }

  onCvSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) {
      return;
    }
    if (file.type !== 'application/pdf') {
      this.errorMsg = 'El curriculum debe ser un PDF';
      this.cvFile = null;
      this.cvName = '';
      return;
    }
    this.cvFile = file;
    this.cvName = file.name;
  }

  goBack() {
    this.router.navigateByUrl(this.returnUrl);
  }

  private refreshCompletion() {
    const snapshot = {
      ...this.profile,
      experience: this.buildExperiencePayload(),
      skills: this.buildSkillsPayload(),
      education: this.buildEducationPayload(),
      cv_filename: this.cvName,
    };
    this.completion = this.profileCompletion.analyze(snapshot, this.user);
  }

  private absorbPendingProfessionalEntries() {
    const experience = {
      company: this.newExperience.company.trim(),
      role: this.newExperience.role.trim(),
      startDate: this.newExperience.startDate,
      endDate: this.newExperience.endDate,
      description: this.newExperience.description.trim(),
    };
    if (experience.company || experience.role || experience.startDate || experience.endDate || experience.description) {
      this.experienceEntries = [experience, ...this.experienceEntries];
      this.newExperience = { company: '', role: '', startDate: '', endDate: '', description: '' };
    }

    const skill = this.newSkill.trim();
    if (skill) {
      this.skillsEntries = [skill, ...this.skillsEntries];
      this.newSkill = '';
    }

    const education = {
      degree: this.newEducation.degree.trim(),
      institution: this.newEducation.institution.trim(),
      completed: !!this.newEducation.completed,
      startDate: this.newEducation.startDate,
      endDate: this.newEducation.completed ? this.newEducation.endDate : '',
    };
    if (education.degree || education.institution || education.startDate || education.endDate) {
      this.educationEntries = [education, ...this.educationEntries];
      this.newEducation = { degree: '', institution: '', completed: false, startDate: '', endDate: '' };
    }
  }

  private applyUserDefaults() {
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

  private hydrateExperienceEntries() {
    this.experienceEntries = this.parseArray(this.profile.experience).map((item: any) => ({
      company: item?.company || '',
      role: item?.role || '',
      startDate: item?.startDate || '',
      endDate: item?.endDate || '',
      description: item?.description || (typeof item === 'string' ? item : ''),
    }));
  }

  private hydrateSkillsEntries() {
    this.skillsEntries = this.parseArray(this.profile.skills)
      .map((item: any) => String(item || '').trim())
      .filter(Boolean);
  }

  private hydrateEducationEntries() {
    this.educationEntries = this.parseArray(this.profile.education).map((item: any) => ({
      degree: item?.degree || '',
      institution: item?.institution || '',
      completed: !!item?.completed,
      startDate: item?.startDate || '',
      endDate: item?.endDate || '',
    }));
  }

  private parseArray(value: any): any[] {
    if (Array.isArray(value)) {
      return value;
    }
    const text = String(value || '').trim();
    if (!text) {
      return [];
    }
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return text.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
    }
  }

  private buildExperiencePayload() {
    const cleaned = this.experienceEntries
      .map((item) => ({
        company: item.company.trim(),
        role: item.role.trim(),
        startDate: item.startDate || '',
        endDate: item.endDate || '',
        description: item.description.trim(),
      }))
      .filter((item) => item.company || item.role || item.startDate || item.endDate || item.description);
    return cleaned.length ? JSON.stringify(cleaned) : '';
  }

  private buildSkillsPayload() {
    const cleaned = this.skillsEntries.map((item) => item.trim()).filter(Boolean);
    return cleaned.length ? JSON.stringify(cleaned) : '';
  }

  private buildEducationPayload() {
    const cleaned = this.educationEntries
      .map((item) => ({
        degree: item.degree.trim(),
        institution: item.institution.trim(),
        completed: !!item.completed,
        startDate: item.startDate || '',
        endDate: item.completed ? item.endDate || '' : '',
      }))
      .filter((item) => item.degree || item.institution || item.startDate || item.endDate);
    return cleaned.length ? JSON.stringify(cleaned) : '';
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
    return names.some((name) => String(name || '').trim().toLowerCase() === normalized);
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

  private safeReturnUrl(value: string | null) {
    const text = String(value || '').trim();
    return text.startsWith('/app/') ? text : '/app/jobs';
  }
}
