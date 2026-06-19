import { Injectable } from '@angular/core';

export interface ProfileCompletionStatus {
  personalComplete: boolean;
  professionalComplete: boolean;
  complete: boolean;
  missingPersonal: string[];
  missingProfessional: string[];
}

@Injectable({ providedIn: 'root' })
export class ProfileCompletionService {
  analyze(profile: any = {}, user: any = null): ProfileCompletionStatus {
    const missingPersonal = [
      this.required('Nombre completo', profile?.full_name || user?.name),
      this.required('Email', profile?.email || user?.email),
      this.required('Telefono', profile?.phone || user?.phone),
      this.required('Region', profile?.address_region),
      this.required('Ciudad', profile?.address_city),
      this.required('Comuna', profile?.address_comuna),
      this.required('Calle', profile?.address_street),
      this.required('Numero', profile?.address_number),
    ].filter(Boolean) as string[];

    const missingProfessional = [
      this.required('Profesion', profile?.profession),
      this.required('Resumen profesional', profile?.summary),
      this.requiredArray('Experiencia laboral', profile?.experience),
      this.requiredArray('Habilidades', profile?.skills),
      this.requiredArray('Estudios', profile?.education),
    ].filter(Boolean) as string[];

    return {
      personalComplete: missingPersonal.length === 0,
      professionalComplete: missingProfessional.length === 0,
      complete: missingPersonal.length === 0 && missingProfessional.length === 0,
      missingPersonal,
      missingProfessional,
    };
  }

  private required(label: string, value: any) {
    return String(value ?? '').trim() ? '' : label;
  }

  private requiredArray(label: string, value: any) {
    return this.parseArray(value).length ? '' : label;
  }

  private parseArray(value: any): any[] {
    if (Array.isArray(value)) {
      return value.filter((item) => {
        if (typeof item === 'string') {
          return item.trim();
        }
        return !!item && Object.values(item).some((entry) => String(entry ?? '').trim());
      });
    }

    const text = String(value ?? '').trim();
    if (!text) {
      return [];
    }

    try {
      const parsed = JSON.parse(text);
      return this.parseArray(parsed);
    } catch {
      return text
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
}
