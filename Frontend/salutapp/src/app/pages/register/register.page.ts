import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule],
})
export class RegisterPage {
  name = '';
  email = '';
  password = '';
  role = 'user';
  locale = 'es';
  phone = '';
  loading = false;

  errors: any = {};
  successMsg = '';

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  submit() {
    this.loading = true;
    this.errors = {};
    this.successMsg = '';

    this.auth.register(this.name, this.email, this.password, this.role, this.locale, this.phone).subscribe({
      next: async (res: any) => {
        this.successMsg = 'Registro exitoso';
        await this.auth.setToken(res.token);
        await this.auth.setUser(res.user);
        this.router.navigateByUrl('/app/jobs', { replaceUrl: true });
      },
      error: (err) => {
        this.errors = err?.error?.errors || {};
      }
    }).add(() => {
      this.loading = false;
    });
  }
}
