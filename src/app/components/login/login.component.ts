import { Component, inject, OnDestroy } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Firestore, collection, addDoc, getDocs, query, where } from '@angular/fire/firestore';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';

interface Usuario {
  email: string;
  perfil: 'admin' | 'specialist' | 'patient';
  emailVerificado: boolean;
  habilitado: boolean;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent  {
  correo = '';
  clave = '';

  private auth = inject(Auth);
  private router = inject(Router);
  private firestore = inject(Firestore);
  private toastr = inject(ToastrService);

  async login() {
    try {
      // Primero, verifica si el usuario existe en Firestore
      const userRef = collection(this.firestore, 'usuarios');
      const q = query(userRef, where('email', '==', this.correo));
      const querySnapshot = await getDocs(q);
  
      if (querySnapshot.empty) {
        this.toastr.error('Usuario no encontrado');
        return;
      }
  
      const userData = querySnapshot.docs[0].data() as Usuario;
  
      // Verifica los permisos antes de iniciar sesión
      if (userData.perfil === 'admin') {
        // Los admins pueden iniciar sesión sin restricciones
        const userCredential = await signInWithEmailAndPassword(this.auth, this.correo, this.clave);
        this.router.navigate(['/home']);
      } else {
        // Para especialistas y pacientes, primero intenta iniciar sesión
        const userCredential = await signInWithEmailAndPassword(this.auth, this.correo, this.clave);
        const user = userCredential.user;
  
        // Ahora verifica el estado de verificación del email
        if (!user.emailVerified) {
          await signOut(this.auth); // Cerrar sesión si no está verificado
          this.toastr.error('Por favor, verifica tu email antes de iniciar sesión');
          return;
        }
  
        // Verifica habilitación para especialistas
        if (userData.perfil === 'specialist' && !userData.habilitado) {
          await signOut(this.auth); // Cerrar sesión si no está habilitado
          this.toastr.error('Tu cuenta está pendiente de aprobación por un administrador');
          return;
        }
  
        // Si todos los cheques pasan, continua a la siguiente página
        this.router.navigate(['/home']);
      }
    } catch (error: any) {
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
  


  // Botones de acceso rápido
  autoFillAdmin() {
    this.correo = 'admin@clinica.com';
    this.clave = '111111';
  }

  autoFillEspecialista() {
    this.correo = 'especialista@guerrillamail.com';
    this.clave = 'esp123';
  }

  autoFillPaciente() {
    this.correo = 'paciente@guerrillamail.com';
    this.clave = 'pac123';
  }
}
