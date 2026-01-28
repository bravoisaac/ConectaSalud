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

  me() {
    return this.http.get(`${environment.apiBase}/me`);
  }

  logout() {
    return this.http.post(`${environment.apiBase}/logout`, {});
  }

  async setToken(token: string) {
    const storage = await this.getStorage();
    await storage.set(this.tokenKey, token);
  }

  async getToken() {
    const storage = await this.getStorage();
    return storage.get(this.tokenKey);
  }

  async clearToken() {
    const storage = await this.getStorage();
    await storage.remove(this.tokenKey);
  }

  async setUser(user: any) {
    const storage = await this.getStorage();
    await storage.set(this.userKey, user);
  }

  async getUser() {
    const storage = await this.getStorage();
    return storage.get(this.userKey);
  }

  async clearUser() {
    const storage = await this.getStorage();
    await storage.remove(this.userKey);
  }
}
