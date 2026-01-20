import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class AdminPage {
  verifications = [
    { name: 'Paula Rios', role: 'health', status: 'pending' },
    { name: 'Clinica Vida', role: 'company', status: 'pending' },
  ];

  reports = [
    { target: 'Post 2391', reason: 'Contenido inapropiado', status: 'open' },
    { target: 'Usuario 112', reason: 'Spam', status: 'open' },
  ];
}
