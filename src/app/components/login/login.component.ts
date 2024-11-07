import { Component, inject, OnInit } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from '@angular/fire/auth';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Firestore, addDoc, collection, getDocs, query, where } from '@angular/fire/firestore';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { EmailMaskPipe } from '../../pipes/email-mask.pipe';
import { PasswordStrengthPipe } from '../../pipes/password-strength.pipe';
import { UserTypeBadgePipe } from '../../pipes/user-type-badge.pipe';
import { AutoFocusDirective } from '../../directives/auto-focus.directive';
import { PasswordToggleDirective } from '../../directives/password-toggle.directive';
import { ShakeOnErrorDirective } from '../../directives/shake-on-error.directive';
interface Usuario {
  email: string;
  perfil: 'admin' | 'specialist' | 'patient';
  emailVerificado: boolean;
  habilitado: boolean;
  imageUrls: string[];
}

interface QuickAccessUser {
  email: string;
  password: string;
  type: string;
  imageUrl: string | null;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PasswordStrengthPipe,
    UserTypeBadgePipe,
    EmailMaskPipe,
    PasswordToggleDirective,
    AutoFocusDirective,
    ShakeOnErrorDirective
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  correo = '';
  clave = '';
  isLoading = true;
  loginError = false;

  quickAccessUsers: QuickAccessUser[] = [
    { email: 'maria@yopmail.com', password: 'pac123', type: 'Paciente 1', imageUrl: null },
    { email: 'carlitos@yopmail.com', password: 'pac123', type: 'Paciente 2', imageUrl: null },
    { email: 'willy@yopmail.com', password: 'pac123', type: 'Paciente 3', imageUrl: null },
    { email: 'rickyricon@yopmail.com', password: '123456', type: 'Especialista 1', imageUrl: null },
    { email: 'wil212233y@yopmail.com', password: '123456', type: 'Especialista 2', imageUrl: null },
    { email: 'admin@clinica.com', password: '111111', type: 'Admin', imageUrl: null },
  ];

  private auth = inject(Auth);
  private router = inject(Router);
  private firestore = inject(Firestore);
  private toastr = inject(ToastrService);
  
  async ngOnInit() {
    await this.loadUserImages();
  }

  private async loadUserImages() {
    try {
      const userRef = collection(this.firestore, 'usuarios');
      
      for (const user of this.quickAccessUsers) {
        const q = query(userRef, where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data() as Usuario;
          
          if (userData.imageUrls && userData.imageUrls.length > 0) {
            user.imageUrl = userData.imageUrls[0];
          }
        }
      }
    } catch (error) {
      console.error('Error al cargar las imágenes:', error);
      this.toastr.error('Error al cargar las imágenes de perfil');
    } finally {
      this.isLoading = false;
    }
  }

  async login() {
    try {
      this.loginError = false;
      const userRef = collection(this.firestore, 'usuarios');
      const q = query(userRef, where('email', '==', this.correo));
      const querySnapshot = await getDocs(q);
  
      if (querySnapshot.empty) {
        this.toastr.error('Usuario no encontrado');
        return;
      }
  
      const userData = querySnapshot.docs[0].data() as Usuario;
      
      // Guardamos los datos del usuario primero
      localStorage.setItem('userProfile', JSON.stringify(userData));
      
      await this.logLogin(userData);


      if (userData.perfil === 'admin') {
        await this.handleAdminLogin(userData);
      } else {
        await this.handleUserLogin(userData);
      }
    } catch (error: any) {
      this.loginError = true;

      console.error('Error al iniciar sesión:', error);

      let mensaje = 'Error al iniciar sesión';
  
      if (error.code === 'auth/user-not-found') {
        mensaje = 'Usuario no encontrado';
      } else if (error.code === 'auth/wrong-password') {
        mensaje = 'Contraseña incorrecta';
      } else if (error.code === 'auth/invalid-email') {
        mensaje = 'Formato de correo inválido';
      } else if (error.code === 'auth/user-disabled') {
        mensaje = 'Usuario deshabilitado';
      }
  
      this.toastr.error(mensaje);
    }
  }

  private async handleAdminLogin(userData: Usuario) {
    const userCredential = await signInWithEmailAndPassword(this.auth, this.correo, this.clave);
    await this.waitForAuthState();
    this.router.navigate(['/home']);
  }

  private async handleUserLogin(userData: Usuario) {
    const userCredential = await signInWithEmailAndPassword(this.auth, this.correo, this.clave);
    const user = userCredential.user;

    if (!user.emailVerified) {
      await signOut(this.auth);
      this.toastr.error('Por favor, verifica tu email antes de iniciar sesión');
      return;
    }

    if (userData.perfil === 'specialist' && !userData.habilitado) {
      await signOut(this.auth);
      this.toastr.error('Tu cuenta está pendiente de aprobación por un administrador');
      return;
    }

    await this.waitForAuthState();
    this.router.navigate(['/home']);
  }

  private waitForAuthState(): Promise<void> {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 10;
      
      const checkAuth = setInterval(() => {
        attempts++;
        const user = this.auth.currentUser;
        
        if (user || attempts >= maxAttempts) {
          clearInterval(checkAuth);
          if (user) {
            // Forzar una pequeña espera adicional para asegurar que todo esté sincronizado
            setTimeout(() => {
              resolve();
            }, 500);
          } else {
            resolve();
          }
        }
      }, 100);
    });
  }
  private async logLogin(userData: Usuario) {
    try {
      const logRef = collection(this.firestore, 'logs');
      await addDoc(logRef, {
        usuario: userData,
        fecha: new Date(),
      });
    } catch (error) {
      console.error('Error al guardar el log de acceso:', error);
    }
  }
  autoFill(email: string, password: string) {
    this.correo = email;
    this.clave = password;
  }
}