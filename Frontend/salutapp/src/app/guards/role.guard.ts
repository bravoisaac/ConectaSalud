import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
    const expectedRoles = (route.data['roles'] as string[]) || [];
    const token = await this.auth.getToken();

    if (!token) {
      this.router.navigateByUrl('/login');
      return false;
    }

    let user = await this.auth.getUser();
    if (!user) {
      try {
        user = await firstValueFrom(this.auth.me());
        await this.auth.setUser(user);
      } catch {
        this.router.navigateByUrl('/login');
        return false;
      }
    }

    if (!expectedRoles.length) {
      return true;
    }

    if (user?.role && expectedRoles.includes(user.role)) {
      return true;
    }

    this.router.navigateByUrl('/app/jobs');
    return false;
  }
}
