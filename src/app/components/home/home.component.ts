import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [], // Agrega aquí imports necesarios si los hay
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'] // Corrige el nombre de la propiedad para estilos
})
export class HomeComponent {
  // Puedes definir propiedades aquí si es necesario
  title = 'Página de Inicio';

  constructor(private router: Router) {}

  // Métodos para manejar eventos o lógica adicional
  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

}
