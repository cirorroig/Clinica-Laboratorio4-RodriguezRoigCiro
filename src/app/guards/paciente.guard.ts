import { Injectable } from '@angular/core';
import { 
  CanActivate, 
  ActivatedRouteSnapshot, 
  RouterStateSnapshot, 
  Router 
} from '@angular/router';
import { 
  Auth, 
  onAuthStateChanged 
} from '@angular/fire/auth';
import { 
  Firestore, 
  collection,
  query,
  where,
  getDocs
} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class PacienteGuards implements CanActivate {
  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      onAuthStateChanged(this.auth, async (user) => {
        if (user) {
          try {
            // Crear una consulta para buscar el documento por el campo uid
            const usersRef = collection(this.firestore, 'usuarios');
            const q = query(usersRef, where('uid', '==', user.uid));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              const userData = querySnapshot.docs[0].data();
              
              // Verificar si el usuario es admin
              if (userData['perfil'] === 'patient' ) {
                resolve(true);
                return;
              }
            }
            
            // Si no se encuentra el usuario o no es admin, redirigir
            this.router.navigate(['/']);
            resolve(false);
          } catch (error) {
            console.error('Error al verificar rol de admin:', error);
            this.router.navigate(['/']);
            resolve(false);
          }
        } else {
          this.router.navigate(['/login']);
          resolve(false);
        }
      });
    });
  }
}
