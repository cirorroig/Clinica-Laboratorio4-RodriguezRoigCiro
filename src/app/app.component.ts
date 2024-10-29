import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { Auth, signOut, Unsubscribe } from '@angular/fire/auth';
import { ChatFlotanteComponent } from './components/chat-flotante/chat-flotante.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, ChatFlotanteComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'Tp1-Juegos';
  private auth = inject(Auth);
  private router = inject(Router);
  authSubscription?: Unsubscribe;
  userEmail?: string;
  isLoggedIn = false;

  ngOnInit() {
    this.authSubscription = this.auth.onAuthStateChanged((user) => {
      if (user) {
        this.isLoggedIn = true;
        this.userEmail = user.email ?? 'Usuario';
      } else {
        this.isLoggedIn = false;
        this.userEmail = undefined;
      }
    });
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  cerrarSesion() {
    signOut(this.auth)
      .then(() => {
        console.log('Sesión cerrada');
        this.router.navigate(['/home']);
      })
      .catch((error) => {
        console.error('Error al cerrar sesión:', error);
      });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription();
    }
  }
}