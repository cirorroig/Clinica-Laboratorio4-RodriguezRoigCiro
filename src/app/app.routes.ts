import { Routes } from '@angular/router';
import { AdminGuard } from './guards/admin.guard';
import { SacarTurnosGuards } from './guards/sacar-turnos.guard';
import { EspecialistaGuards } from './guards/especialista.guard';
import { MisturnosGuards } from './guards/misturnos.guard';
export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () =>
      import('./components/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login.component').then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: 'registro',
    loadComponent: () =>
      import('./components/registro/registro.component').then(
        (m) => m.RegistroComponent
      ),
  },
  {
    path: 'quien-soy',
    loadComponent: () =>
      import('./components/quien-soy/quien-soy.component').then(
        (m) => m.QuienSoyComponent
      ),
  },
  {
    path: 'misTurnos',
    loadComponent: () =>
      import('./components/mis-turnos/mis-turnos.component').then(
        (m) => m.MisTurnosComponent
      ),
      canActivate:[MisturnosGuards]
  },
  {
    path: 'solicitarTurno',
    loadComponent: () =>
      import('./components/solicitar-turno/solicitar-turno.component').then(
        (m) => m.SolicitarTurnoComponent
      ),
      canActivate: [SacarTurnosGuards],
  },
  {
    path: 'usuarios',
    loadComponent: () =>
      import('./components/usuarios/usuarios.component').then(
        (m) => m.UsuariosComponent
      ),
    canActivate: [AdminGuard],
  },
  {
    path: 'turnos',
    loadComponent: () =>
      import('./components/turnos/turnos.component').then(
        (m) => m.TurnosComponent
      ),
    canActivate: [AdminGuard],
  },{
    path: 'mi-perfil',
    loadComponent: () =>
      import('./components/mi-perfil/mi-perfil.component').then(
        (m) => m.MiPerfilComponent
      ),
  },
  {
    path: 'pacientes',
    loadComponent: () =>
      import('./components/pacientes/pacientes.component').then(
        (m) => m.PacientesComponent
      ),
    canActivate: [EspecialistaGuards],
  },
  {
    path: 'estadisticas',
    loadComponent: () =>
      import('./components/estadisticas/estadisticas.component').then(
        (m) => m.EstadisticasComponent
      ),
    canActivate: [AdminGuard],
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
