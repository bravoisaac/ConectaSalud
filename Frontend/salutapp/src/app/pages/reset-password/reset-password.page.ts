import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule],
})
export class ResetPasswordPage implements OnInit {
  email = '';
  token = '';
  password = '';
  passwordConfirmation = '';
  loading = false;
  successMsg = '';
  errorMsg = '';
  showPassword = false;
  showPasswordConfirmation = false;

  constructor(
    private auth: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    const query = this.route.snapshot.queryParamMap;
    this.email = query.get('email') || '';
    this.token = query.get('token') || '';

    if (!this.email || !this.token) {
      this.errorMsg = 'El enlace de recuperacion no es valido o esta incompleto.';
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  togglePasswordConfirmation() {
    this.showPasswordConfirmation = !this.showPasswordConfirmation;
  }

  submit() {
    if (this.loading || !this.email || !this.token) {
      return;
    }

    this.loading = true;
    this.successMsg = '';
    this.errorMsg = '';

    this.auth.resetPassword(
      this.email,
      this.token,
      this.password,
      this.passwordConfirmation
    ).subscribe({
      next: (res: any) => {
        this.password = '';
        this.passwordConfirmation = '';
        this.successMsg =
          res?.message ||
          'Contrasena actualizada. Inicia sesion nuevamente.';
      },
      error: (err) => {
        this.errorMsg =
          err?.error?.errors?.password?.[0] ||
          err?.error?.errors?.email?.[0] ||
          err?.error?.message ||
          'No pudimos actualizar la contrasena.';
      },
    }).add(() => {
      this.loading = false;
    });
  }
}
