import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule],
})
export class ProfilePage implements OnInit {
  user: any = null;
  isAdmin = false;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  async ngOnInit() {
    const stored = await this.auth.getUser();
    if (stored) {
      this.user = stored;
      this.isAdmin = stored.role === 'admin';
      return;
    }

    this.auth.me().subscribe({
      next: async (res: any) => {
        this.user = res;
        this.isAdmin = res?.role === 'admin';
        await this.auth.setUser(res);
      }
    });
  }

  async logout() {
    await this.auth.clearToken();
    await this.auth.clearUser();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
