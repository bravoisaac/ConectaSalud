import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Storage } from '@ionic/storage-angular';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'token';
  private userKey = 'user';
  private storageReady: Promise<void>;
  private storageInstance: Storage | null = null;

  constructor(
    private http: HttpClient,
    private storage: Storage
  ) {
    this.storageReady = this.initStorage();
  }

  private async initStorage() {
    this.storageInstance = await this.storage.create();
  }

  private async getStorage(): Promise<Storage> {
    await this.storageReady;
    if (!this.storageInstance) {
      throw new Error('Storage no inicializado');
    }
    return this.storageInstance;
  }

  private getLocalValue(key: string) {
    try {
      if (typeof localStorage === 'undefined') {
        return null;
      }
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private setLocalValue(key: string, value: string) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch {
      // Ionic Storage remains the primary store when localStorage is unavailable.
    }
  }

  private removeLocalValue(key: string) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch {
      // Ignore browser storage restrictions.
    }
  }

  private getSessionValue(key: string) {
    try {
      if (typeof sessionStorage === 'undefined') {
        return null;
      }
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private setSessionValue(key: string, value: string) {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(key, value);
      }
    } catch {
      // Session storage is only a fallback for non-remembered sessions.
    }
  }

  private removeSessionValue(key: string) {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(key);
      }
    } catch {
      // Ignore browser storage restrictions.
    }
  }

  register(
    name: string,
    email: string,
    password: string,
    role: string,
    locale: string,
    phone?: string
  ) {
    return this.http.post(`${environment.apiBase}/register`, {
      name,
      email,
      password,
      role,
      locale,
      phone,
    });
  }

  login(email: string, password: string) {
    return this.http.post(`${environment.apiBase}/login`, {
      email,
      password,
    });
  }

  forgotPassword(email: string) {
    return this.http.post(`${environment.apiBase}/forgot-password`, {
      email,
    });
  }

  resetPassword(
    email: string,
    token: string,
    password: string,
    passwordConfirmation: string
  ) {
    return this.http.post(`${environment.apiBase}/reset-password`, {
      email,
      token,
      password,
      password_confirmation: passwordConfirmation,
    });
  }

  me() {
    return this.http.get(`${environment.apiBase}/me`);
  }

  logout() {
    return this.http.post(`${environment.apiBase}/logout`, {});
  }

  async setToken(token: string, remember = true) {
    const storage = await this.getStorage();
    if (remember) {
      await storage.set(this.tokenKey, token);
      this.setLocalValue(this.tokenKey, token);
      this.removeSessionValue(this.tokenKey);
      return;
    }
    await storage.remove(this.tokenKey);
    this.removeLocalValue(this.tokenKey);
    this.setSessionValue(this.tokenKey, token);
  }

  async getToken() {
    const storage = await this.getStorage();
    const token = await storage.get(this.tokenKey);
    if (token) {
      return token;
    }
    const localToken = this.getLocalValue(this.tokenKey);
    if (localToken) {
      await storage.set(this.tokenKey, localToken);
    }
    return localToken || this.getSessionValue(this.tokenKey);
  }

  async clearToken() {
    const storage = await this.getStorage();
    await storage.remove(this.tokenKey);
    this.removeLocalValue(this.tokenKey);
    this.removeSessionValue(this.tokenKey);
  }

  async setUser(user: any, remember = true) {
    const storage = await this.getStorage();
    const serialized = JSON.stringify(user);
    if (remember) {
      await storage.set(this.userKey, user);
      this.setLocalValue(this.userKey, serialized);
      this.removeSessionValue(this.userKey);
      return;
    }
    await storage.remove(this.userKey);
    this.removeLocalValue(this.userKey);
    this.setSessionValue(this.userKey, serialized);
  }

  async getUser() {
    const storage = await this.getStorage();
    const user = await storage.get(this.userKey);
    if (user) {
      return user;
    }
    const localUser = this.getLocalValue(this.userKey);
    if (!localUser) {
      return null;
    }
    try {
      const parsed = JSON.parse(localUser);
      await storage.set(this.userKey, parsed);
      return parsed;
    } catch {
      this.removeLocalValue(this.userKey);
    }

    const sessionUser = this.getSessionValue(this.userKey);
    if (!sessionUser) {
      return null;
    }
    try {
      return JSON.parse(sessionUser);
    } catch {
      this.removeSessionValue(this.userKey);
      return null;
    }
  }

  async clearUser() {
    const storage = await this.getStorage();
    await storage.remove(this.userKey);
    this.removeLocalValue(this.userKey);
    this.removeSessionValue(this.userKey);
  }
}
