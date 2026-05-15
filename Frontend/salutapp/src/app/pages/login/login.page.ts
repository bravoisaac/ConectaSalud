import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule],
})
export class LoginPage {
  email = '';
  password = '';
  errorMsg = '';
  loading = false;
  showPassword = false;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  submit() {
    this.loading = true;
    this.errorMsg = '';

    this.auth.login(this.email, this.password).subscribe({
      next: async (res: any) => {
        await this.auth.setToken(res.token);
        await this.auth.setUser(res.user);
        this.router.navigateByUrl('/app/jobs', { replaceUrl: true });
      },
      error: (err) => {
        this.errorMsg =
          err?.error?.message ||
          err?.error?.errors?.email?.[0] ||
          'Error al iniciar sesion';
      }
    }).add(() => {
      this.loading = false;
    });
  }
}
