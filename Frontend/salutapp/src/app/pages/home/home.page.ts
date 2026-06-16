import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { ProductService } from '../../services/product.service';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, EmptyStateComponent, LoadingStateComponent],
})
export class HomePage implements OnInit {
  products: any[] = [];
  errorMsg = '';

  // formulario para crear nuevo registro
  nuevo = {
    name: '',
    description: '',
    price: 0,
    fecha: '', // yyyy-mm-dd
    estado_aprobacion: 'pendiente',
    estado_proceso: 'en_proceso'
  };

  loadingList = false;
  saving = false;

  constructor(private productSvc: ProductService) {}

  ngOnInit() {
    this.cargarListado();
  }

  cargarListado() {
    this.loadingList = true;
    this.errorMsg = '';

    this.productSvc.list().subscribe({
      next: (res: any) => {
        // paginate() devuelve { data: [...] }
        this.products = res?.data ? res.data : res;
      },
      error: () => {
        this.errorMsg = 'No se pudo cargar la lista';
      }
    }).add(() => {
        this.loadingList = false;
    });
  }

  crearRegistro() {
    this.saving = true;
    this.errorMsg = '';

    this.productSvc.create(this.nuevo).subscribe({
      next: () => {
        this.nuevo = {
          name: '',
          description: '',
          price: 0,
          fecha: '',
          estado_aprobacion: 'pendiente',
          estado_proceso: 'en_proceso'
        };
        this.cargarListado();
      },
      error: (err) => {
        const errors = err?.error?.errors;
        if (errors) {
          const firstKey = Object.keys(errors)[0];
          this.errorMsg = errors[firstKey][0];
        } else {
          this.errorMsg = 'Error al crear el registro';
        }
      }
    }).add(() => {
      this.saving = false;
    });
  }
}
