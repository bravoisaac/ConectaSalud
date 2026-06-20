import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule],
})
export class ForgotPasswordPage {
  email = '';
  loading = false;
  successMsg = '';
  errorMsg = '';

  constructor(private auth: AuthService) {}

  submit() {
    if (this.loading) {
      return;
    }

    this.loading = true;
    this.successMsg = '';
    this.errorMsg = '';

    this.auth.forgotPassword(this.email).subscribe({
      next: (res: any) => {
        this.successMsg =
          res?.message ||
          'Si el correo existe, enviaremos instrucciones para recuperar la cuenta.';
      },
      error: (err) => {
        this.errorMsg =
          err?.error?.errors?.email?.[0] ||
          err?.error?.message ||
          'No pudimos procesar la solicitud.';
      },
    }).add(() => {
      this.loading = false;
    });
  }
}
