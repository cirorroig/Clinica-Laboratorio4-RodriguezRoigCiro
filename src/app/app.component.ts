import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, signOut, Unsubscribe, User } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
} from '@angular/fire/firestore';
import { RouterOutlet } from '@angular/router';
import { RouterModule } from '@angular/router';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'clinica';
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  authSubscription?: Unsubscribe;
  userName?: string;
  isLoggedIn = false;

  ngOnInit() {
    this.authSubscription = this.auth.onAuthStateChanged((user) => {
      if (user) {
        this.isLoggedIn = true;
        this.fetchUserDetails(user);
      } else {
        this.isLoggedIn = false;
        this.userName = undefined;
      }
    });
  }

  async fetchUserDetails(user: User) {
    const usersRef = collection(this.firestore, 'usuarios');
    const q = query(usersRef, where('uid', '==', user.uid));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      this.userName = `${userData['nombre']} ${userData['apellido']}`;
    } else {
      console.error('No se encontró la información del usuario');
    }
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
