import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'registro',
    loadComponent: () => import('./components/registro/registro.component').then(m => m.RegistroComponent)
  },
  {
    path: 'quien-soy',
    loadComponent: () => import('./components/quien-soy/quien-soy.component').then(m => m.QuienSoyComponent)
  },
  {
    path: 'ahorcado',
    loadComponent: () => import('./components/ahorcado/ahorcado.component').then(m => m.AhorcadoComponent)
  },
  {
    path: 'mayor-menor',
    loadComponent: () => import('./components/mayor-menor/mayor-menor.component').then(m => m.MayorMenorComponent)
  },
  {
    path: 'preguntados',
    loadComponent: () => import('./components/preguntados/preguntados.component').then(m => m.PreguntadosComponent)
  },
  {
    path: 'snake',
    loadComponent: () => import('./components/snake/snake.component').then(m => m.SnakeComponent)
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  }
];