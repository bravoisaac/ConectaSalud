import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Storage } from '@ionic/storage-angular';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'token';
  private userKey = 'user';

  constructor(
    private http: HttpClient,
    private storage: Storage
  ) {
    this.storage.create();
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
    await this.storage.set(this.tokenKey, token);
  }

  async getToken() {
    return this.storage.get(this.tokenKey);
  }

  async clearToken() {
    await this.storage.remove(this.tokenKey);
  }

  async setUser(user: any) {
    await this.storage.set(this.userKey, user);
  }

  async getUser() {
    return this.storage.get(this.userKey);
  }

  async clearUser() {
    await this.storage.remove(this.userKey);
  }
}
