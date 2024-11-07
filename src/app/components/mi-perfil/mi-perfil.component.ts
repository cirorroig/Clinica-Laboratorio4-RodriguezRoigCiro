import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
} from '@angular/fire/firestore';
import { CustomStylesDirective } from '../../directives/custom-styles.directive';
interface DatoDinamico {
  clave: string;
  valor: string | number;
}

interface Turno {
  id: string;
  uidPaciente: string;
  uidEspecialista: string;
  fecha: Date;
  hora: string;
  status: string;
  especialidad: string;
  altura: number | null;
  peso: number | null;
  temperatura: number | null;
  presion: string | null;
  datosDinamicos: DatoDinamico[];
  diagnostico: string;
  comentarioAtencion: string;
}

interface UserData {
  uid: string;
  nombre: string;
  apellido: string;
  edad: number;
  dni: string;
  email: string;
  perfil: 'patient' | 'specialist' | 'admin';
  imageUrls: string[];
  obraSocial?: string;
  especialidades?: string[];
}

interface Availability {
  uid: string;
  dias: string[];
  horarios: number[];
  fechasTomadas: string[];
}

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule,CustomStylesDirective],
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.css'],
})
export class MiPerfilComponent implements OnInit {
  userData: UserData | null = null;
  availability: Availability | null = null;
  isSpecialist = false;
  availabilityForm: FormGroup;
  daysOfWeek = [
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
    'Domingo',
  ];
  hoursRange = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 to 20:00
  loading = true;
  errorMessage = '';
  successMessage = '';
  historialClinico: Turno[] = [];
  loadingHistorial = true;
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private fb = inject(FormBuilder);

  constructor() {
    this.availabilityForm = this.fb.group({
      dias: [[], [Validators.required]],
      horarioInicio: [8, [Validators.required]],
      horarioFin: [20, [Validators.required]],
    });
  }

  ngOnInit() {
    onAuthStateChanged(this.auth, async (user) => {
      if (user) {
        await this.loadUserData();
        if (this.userData?.perfil === 'patient') {
          await this.loadHistorialClinico();
          console.log(this.historialClinico);
        }
      } else {
        this.errorMessage = 'Usuario no autenticado';
        this.loading = false;
      }
    });
  }
  private async loadHistorialClinico() {
    try {
      this.loadingHistorial = true;
      const turnosRef = collection(this.firestore, 'turnos');
      const q = query(
        turnosRef,
        where('uidPaciente', '==', this.userData?.uid),
        where('status', '==', 'COMPLETADO'),
        // Asegurarse de que al menos uno de los datos clínicos no sea null
        where('altura', '!=', null)
      );
      console.log(q);

      const querySnapshot = await getDocs(q);

      this.historialClinico = querySnapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            // Convertir explícitamente el Timestamp a Date
            fecha:
              data['fecha'] instanceof Timestamp
                ? data['fecha'].toDate()
                : new Date(data['fecha']),
          } as Turno;
        })
        .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
    } catch (error) {
      console.error('Error al cargar el historial clínico:', error);
      this.errorMessage = 'Error al cargar el historial clínico';
    } finally {
      this.loadingHistorial = false;
    }
  }
  // En la clase MiPerfilComponent, añade este método
  trackByTurno(index: number, turno: Turno): string {
    return turno.id;
  }

  trackByDato(index: number, dato: DatoDinamico): string {
    return dato.clave;
  }
  private async loadUserData() {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) throw new Error('No user logged in');

      const usersRef = collection(this.firestore, 'usuarios');
      const q = query(usersRef, where('uid', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        this.userData = querySnapshot.docs[0].data() as UserData;
        this.isSpecialist = this.userData.perfil === 'specialist';

        if (this.isSpecialist) {
          await this.loadAvailability();
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.errorMessage = 'Error al cargar los datos del usuario';
    } finally {
      this.loading = false;
    }
  }

  private async loadAvailability() {
    try {
      const availabilityRef = collection(this.firestore, 'disponibilidad');
      const q = query(availabilityRef, where('uid', '==', this.userData?.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        this.availability = querySnapshot.docs[0].data() as Availability;
        this.availabilityForm.patchValue({
          dias: this.availability.dias,
          horarioInicio: Math.min(...this.availability.horarios),
          horarioFin: Math.max(...this.availability.horarios),
        });
      }
    } catch (error) {
      console.error('Error loading availability:', error);
      this.errorMessage = 'Error al cargar la disponibilidad horaria';
    }
  }

  toggleDay(day: string) {
    const currentDays = this.availabilityForm.get('dias')?.value || [];
    const index = currentDays.indexOf(day);

    if (index === -1) {
      currentDays.push(day);
    } else {
      currentDays.splice(index, 1);
    }

    this.availabilityForm.patchValue({ dias: currentDays });
  }

  isDaySelected(day: string): boolean {
    return this.availabilityForm.get('dias')?.value?.includes(day) || false;
  }

  async updateAvailability() {
    if (this.availabilityForm.invalid) {
      this.errorMessage = 'Por favor complete todos los campos requeridos';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const formValues = this.availabilityForm.value;
      const horarios = [];

      for (let i = formValues.horarioInicio; i <= formValues.horarioFin; i++) {
        horarios.push(i);
      }

      const availabilityRef = collection(this.firestore, 'disponibilidad');
      const q = query(availabilityRef, where('uid', '==', this.userData?.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docRef = doc(
          this.firestore,
          'disponibilidad',
          querySnapshot.docs[0].id
        );
        await updateDoc(docRef, {
          dias: formValues.dias,
          horarios: horarios,
        });

        this.successMessage = 'Horarios actualizados correctamente';
        await this.loadAvailability();
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      this.errorMessage = 'Error al actualizar los horarios';
    } finally {
      this.loading = false;
    }
  }
  // En mi-perfil.component.ts, añade este método a la clase
  hasDatosDinamicosValidos(datosDinamicos: DatoDinamico[]): boolean {
    if (!datosDinamicos) return false;
    return datosDinamicos.some(
      (dato) => dato.clave !== null && dato.valor !== null
    );
  }
  convertTimestampToDate(timestamp: any): Date {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    } else if (timestamp instanceof Date) {
      return timestamp;
    } else if (timestamp?.seconds) {
      // Para objetos que parecen Timestamps pero no lo son
      return new Date(timestamp.seconds * 1000);
    } else {
      return new Date(timestamp);
    }
  }
}
