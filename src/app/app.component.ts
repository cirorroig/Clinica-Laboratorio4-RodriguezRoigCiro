import { Component, inject, OnDestroy, OnInit,ChangeDetectorRef  } from '@angular/core';
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
import { CommonModule } from '@angular/common';

interface Usuario {
  email: string;
  perfil: 'admin' | 'specialist' | 'patient';
  emailVerificado: boolean;
  habilitado: boolean;
  imageUrls: string[];
  nombre?: string;
}




@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule,CommonModule],
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
  isPatient = false;
  isSpecialist = false;
  isAdmin = false;
  userType?: 'patient' | 'specialist' | 'admin'; // Agregar esta variable

  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    // Intentar cargar del localStorage primero
    const cachedProfile = localStorage.getItem('userProfile');
    if (cachedProfile) {
      const userData = JSON.parse(cachedProfile);
      this.isLoggedIn = true;
      this.userName = userData.nombre;
      this.cdr.detectChanges();
    }

    this.authSubscription = this.auth.onAuthStateChanged(async (user) => {
      if (user) {
        this.isLoggedIn = true;
        const cachedProfile = localStorage.getItem('userProfile');
        
        if (cachedProfile) {
          const userData = JSON.parse(cachedProfile);
          this.userName = userData.nombre;
          this.userType = userData.perfil
        }
        
        await this.fetchUserDetails(user);
        this.cdr.detectChanges();
      } else {
        this.isLoggedIn = false;
        this.userName = undefined;
        localStorage.removeItem('userProfile');
        this.cdr.detectChanges();
      }
    });


    console.log(this.isLoggedIn);
    console.log(this.userType);
    
    
  }

  private async fetchUserDetails(user: any) {
    try {
      const userRef = collection(this.firestore, 'usuarios');
      const q = query(userRef, where('email', '==', user.email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data() as any;
        this.userName = userData.nombre;
        localStorage.setItem('userProfile', JSON.stringify(userData));
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('Error al obtener detalles del usuario:', error);
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
  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription();
    }
  }
}
