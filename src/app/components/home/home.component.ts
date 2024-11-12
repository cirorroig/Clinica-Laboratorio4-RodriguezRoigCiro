import { ChangeDetectorRef, Component,inject,OnInit } from '@angular/core';
import { Auth, Unsubscribe } from '@angular/fire/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [], // Agrega aquí imports necesarios si los hay
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'] // Corrige el nombre de la propiedad para estilos
})
export class HomeComponent implements OnInit{
  // Puedes definir propiedades aquí si es necesario
  title = 'Página de Inicio';
  isLoggedIn = false;

  private auth = inject(Auth);
  authSubscription?: Unsubscribe;
  private cdr = inject(ChangeDetectorRef);

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.authSubscription = this.auth.onAuthStateChanged(async (user) => {
      if (user) {
        this.isLoggedIn = true;

        this.cdr.detectChanges();
      } else {
        this.isLoggedIn = false;
        localStorage.removeItem('userProfile');
        this.cdr.detectChanges();
      }
    });
  }
  // Métodos para manejar eventos o lógica adicional
  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription();
    }
  }
}
