import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeMode = 'system' | 'dark' | 'light';
export type FontSizeMode = 'sm' | 'md' | 'lg';

export interface UiSettings {
  themeMode: ThemeMode;
  fontSize: FontSizeMode;
  highContrast: boolean;
}

const DEFAULT_SETTINGS: UiSettings = {
  themeMode: 'dark',
  fontSize: 'md',
  highContrast: false,
};

@Injectable({ providedIn: 'root' })
export class UiSettingsService {
  private readonly storageKey = 'salut.uiSettings.v1';
  readonly settings$ = new BehaviorSubject<UiSettings>(DEFAULT_SETTINGS);
  private prefersDarkMql?: MediaQueryList;

  init() {
    this.bindSystemThemeListener();
    const loaded = this.loadFromStorage();
    this.settings$.next(loaded);
    this.apply(loaded);
  }

  update(patch: Partial<UiSettings>) {
    const next: UiSettings = { ...this.settings$.value, ...patch };
    this.settings$.next(next);
    this.saveToStorage(next);
    this.apply(next);
  }

  private loadFromStorage(): UiSettings {
    try {
      if (typeof localStorage === 'undefined') {
        return DEFAULT_SETTINGS;
      }
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return DEFAULT_SETTINGS;
      }
      const parsed = JSON.parse(raw) as Partial<UiSettings>;
      const themeMode: ThemeMode =
        parsed.themeMode === 'dark' || parsed.themeMode === 'light' || parsed.themeMode === 'system'
          ? parsed.themeMode
          : DEFAULT_SETTINGS.themeMode;
      const fontSize: FontSizeMode =
        parsed.fontSize === 'sm' || parsed.fontSize === 'md' || parsed.fontSize === 'lg'
          ? parsed.fontSize
          : DEFAULT_SETTINGS.fontSize;
      const highContrast = !!parsed.highContrast;
      return { themeMode, fontSize, highContrast };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  private saveToStorage(settings: UiSettings) {
    try {
      if (typeof localStorage === 'undefined') {
        return;
      }
      localStorage.setItem(this.storageKey, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }

  private apply(settings: UiSettings) {
    if (typeof document === 'undefined') {
      return;
    }
    const root = document.documentElement;

    root.classList.remove('ui-theme-dark', 'ui-theme-light');
    if (settings.themeMode === 'dark') {
      root.classList.add('ui-theme-dark');
    } else if (settings.themeMode === 'light') {
      root.classList.add('ui-theme-light');
    }

    const prefersDark = this.prefersDarkMql?.matches ?? false;
    const useDarkPalette = settings.themeMode === 'dark' || (settings.themeMode === 'system' && prefersDark);
    root.classList.toggle('ion-palette-dark', useDarkPalette);

    root.classList.remove('ui-font-sm', 'ui-font-md', 'ui-font-lg');
    root.classList.add(`ui-font-${settings.fontSize}`);

    root.classList.toggle('ui-contrast-high', !!settings.highContrast);
  }

  private bindSystemThemeListener() {
    if (this.prefersDarkMql || typeof window === 'undefined') {
      return;
    }
    try {
      this.prefersDarkMql = window.matchMedia('(prefers-color-scheme: dark)');
      this.prefersDarkMql.addEventListener('change', () => {
        const current = this.settings$.value;
        if (current.themeMode === 'system') {
          this.apply(current);
        }
      });
    } catch {
      // ignore
    }
  }
}
