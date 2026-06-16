import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './loading-state.component.html',
  styleUrls: ['./loading-state.component.scss'],
})
export class LoadingStateComponent {
  @Input() title = 'Cargando';
  @Input() description = 'Preparando la informacion...';
  @Input() compact = false;
}
