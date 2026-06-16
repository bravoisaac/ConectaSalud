import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  async canActivate(): Promise<boolean> {
    const token = await this.auth.getToken();
    if (!token) {
      this.router.navigateByUrl('/login');
      return false;
    }

    try {
      const user = await firstValueFrom(this.auth.me());
      await this.auth.setUser(user);
      return true;
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) {
        await this.auth.clearToken();
        await this.auth.clearUser();
        this.router.navigateByUrl('/login');
        return false;
      }

      const cachedUser = await this.auth.getUser();
      if (cachedUser) {
        return true;
      }

      this.router.navigateByUrl('/login');
      return false;
    }
  }
}
