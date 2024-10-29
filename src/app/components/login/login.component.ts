import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Auth, signInWithEmailAndPassword, Unsubscribe } from '@angular/fire/auth';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit, OnDestroy {
  correo = '';
  clave = '';
  authSubscription?: Unsubscribe;
  private auth = inject(Auth);
  private router = inject(Router);
  private firestore = inject(Firestore);

  ngOnInit() {
    this.authSubscription = this.auth.onAuthStateChanged((auth) => {
      console.log(auth);
      if (auth?.email) {
        this.router.navigateByUrl('');
      }
    });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription();
    }
  }

  login() {
    signInWithEmailAndPassword(this.auth, this.correo, this.clave)
      .then((userCredential) => {
        const user = userCredential.user;

        // Registro exitoso, guardar log en Firestore
        const log = {
          usuario: user.email,
          fechaIngreso: new Date().toISOString(), // Fecha de ingreso
        };

        // Guardar el log en Firestore
        const logsCollection = collection(this.firestore, 'logs');
        addDoc(logsCollection, log)
          .then(() => {
            console.log('Log registrado con éxito');
            this.router.navigate(['/home']); // Redirigir después del login
          })
          .catch((error) => {
            console.error('Error al registrar el log:', error);
          });
      })
      .catch((error) => {
        console.error('Error al iniciar sesión:', error);
      });
  }


  autoFill() {
    // Rellena los campos con datos hardcodeados
    this.correo = 'test@gmail.com';
    this.clave = '111111'; // Asegúrate de usar una contraseña que exista en tu sistema
  }
}
