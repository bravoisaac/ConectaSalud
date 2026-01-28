import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';

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

  constructor(
    private auth: AuthService,
    private router: Router,
    private profileService: ProfileService
  ) {}

  async ngOnInit() {
    const stored = await this.auth.getUser();
    if (stored) {
      this.user = stored;
      this.isAdmin = stored.role === 'admin';
      this.applyUserDefaults();
      this.loadProfile();
      return;
    }

    this.auth.me().subscribe({
      next: async (res: any) => {
        this.user = res;
        this.isAdmin = res?.role === 'admin';
        await this.auth.setUser(res);
        this.applyUserDefaults();
        this.loadProfile();
      }
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

  async logout() {
    await this.auth.clearToken();
    await this.auth.clearUser();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
