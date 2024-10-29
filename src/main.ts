import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideFirebaseApp(() =>
      initializeApp({
        projectId: 'clinica-rodriguezroig-ciro',
        appId: '1:295037508816:web:86d37a30135dd5f60b12d5',
        storageBucket: 'clinica-rodriguezroig-ciro.appspot.com',
        apiKey: 'AIzaSyDr373PT9NskA0F3hjYPuzEaf3DHoxEHeA',
        authDomain: 'clinica-rodriguezroig-ciro.firebaseapp.com',
        messagingSenderId: '295037508816',
      })
    ),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()),
    provideAnimations(), // Necesario para Toastr
    provideToastr({
      timeOut: 3000,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
      progressBar: true
    }),
  ],
}).catch((err) => console.error(err));