import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import {
  collection,
  collectionData,
  doc,
  Firestore,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Auth, getAuth, onAuthStateChanged, User } from '@angular/fire/auth';
import Swal from 'sweetalert2';

enum AppointmentStatus {
  PENDING = 'PENDIENTE',
  ACCEPTED = 'ACEPTADO',
  REJECTED = 'RECHAZADO',
  COMPLETED = 'COMPLETADO',
  CANCELLED = 'CANCELADO',
}

interface Appointment {
  nombrePaciente: string;
  id?: string;
  uidPaciente: string;
  uidEspecialista: string;
  fecha: Date;
  hora: number;
  asignado: boolean;
  status: AppointmentStatus;
  especialidad: string;
  comentarioCancelacion?: string;
  comentarioRechazo?: string;
  resena?: string;
  calificacion?: string;
  comentarioAtencion?: string;
  diagnostico?: string;
  altura?: number;
  peso?: number;
  temperatura?: number;
  presion?: number;
  datosDinamicos: { clave: string; valor: string }[];
}

interface Patient {
  uid: string;
  nombre: string;
  apellido: string;
  email: string;
  imageUrl?: string;
}
interface Specialist {
  uid: string;
  nombre: string;
  apellido: string;
  especialidad: string;
  email: string;
  imageUrl?: string;
}

@Component({
  selector: 'app-mis-turnos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './mis-turnos.component.html',
  styleUrls: ['./mis-turnos.component.css'],
})
export class MisTurnosComponent implements OnInit {
  specificDataFilter: string = '';
  appointments: Appointment[] = [];
  filteredAppointments: Appointment[] = [];
  specialists: Specialist[] = [];
  patients: Patient[] = [];
  specialties: string[] = [];
  selectedSpecialty: string = '';
  selectedPatient: string = '';
  showModal = false;
  modalTitle = '';
  modalAction: 'cancel' | 'rate' | 'view' | 'reject' | 'finish' = 'view';
  selectedAppointment: Appointment | null = null;
  isSpecialist = false;
  currentUser: User | null = null;

  commentForm = new FormGroup({
    comment: new FormControl('', Validators.required),
  });

  ratingForm = new FormGroup({
    rating: new FormControl('', [
      Validators.required,
      Validators.min(1),
      Validators.max(5),
    ]),
    comment: new FormControl('', Validators.required),
  });

  diagnosisForm = new FormGroup({
    diagnosis: new FormControl('', Validators.required),
    review: new FormControl('', Validators.required),
    altura: new FormControl('', Validators.required),
    peso: new FormControl('', Validators.required),
    temperatura: new FormControl('', Validators.required),
    presion: new FormControl('', Validators.required),
    clave0: new FormControl(''),
    valor0: new FormControl(''),
    clave1: new FormControl(''),
    valor1: new FormControl(''),
    clave2: new FormControl(''),
    valor2: new FormControl(''),
  });

  selectedSpecialist: string | undefined;
  dinamicos: { clave: string; valor: string }[] = [];
  constructor(private firestore: Firestore, private auth: Auth) { }

  async ngOnInit() {
    await this.checkUserRole();
    await this.loadAppointments();
    await this.loadSpecialties();
    await this.loadSpecialists();
    await this.loadPatients();
  }

  private async checkUserRole() {
    try {
      const auth = getAuth();
      this.currentUser = await new Promise<User>((resolve, reject) => {
        onAuthStateChanged(auth, (user) => {
          if (user) resolve(user);
          else reject(new Error('No user authenticated'));
        });
      });
      console.log('uid', this.currentUser.uid);

      const usersRef = collection(this.firestore, 'usuarios');
      const q = query(usersRef, where('uid', '==', this.currentUser.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();

        // Verificar si el usuario es admin
        if (userData['perfil'] === 'specialist') {
          this.isSpecialist = true;
        } else {
          this.isSpecialist = false;
        }
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  }

  private async loadAppointments() {
    try {
      if (!this.currentUser?.uid) {
        throw new Error('No user authenticated');
      }

      const appointmentsRef = collection(this.firestore, 'turnos');
      const appointmentsQuery = query(
        appointmentsRef,
        where(
          this.isSpecialist ? 'uidEspecialista' : 'uidPaciente',
          '==',
          this.currentUser.uid
        )
      );

      const querySnapshot = await getDocs(appointmentsQuery);
      const appointmentsPromises = querySnapshot.docs.map(
        async (docSnapshot) => {
          const data = docSnapshot.data() as Appointment;

          // Cargar nombre del paciente si el usuario actual es un especialista
          if (this.isSpecialist && data.uidPaciente) {
            const usersRef = collection(this.firestore, 'usuarios');
            const patientQuery = query(
              usersRef,
              where('uid', '==', data.uidPaciente)
            );
            const patientSnapshot = await getDocs(patientQuery);

            if (!patientSnapshot.empty) {
              const patientData = patientSnapshot.docs[0].data();
              data.nombrePaciente = `${patientData?.['nombre']} ${patientData?.['apellido']}`;
            }
          }

          return {
            id: docSnapshot.id,
            ...data,
            fecha: data.fecha || new Date(),
          } as Appointment;
        }
      );

      this.appointments = await Promise.all(appointmentsPromises);
      console.log('appointments con nombres de pacientes:', this.appointments);

      this.filteredAppointments = [...this.appointments];
      console.log(this.filteredAppointments);
    } catch (error) {
      console.error('Error loading appointments:', error);
      await Swal.fire({
        title: 'Error',
        text: 'No se pudieron cargar los turnos',
        icon: 'error',
      });
    }
  }

  private async loadPatients() {
    console.log(this.isSpecialist);

    if (!this.isSpecialist) return;

    try {
      const uniquePatientIds = [
        ...new Set(this.appointments.map((a) => a.uidPaciente)),
      ];
      console.log(uniquePatientIds);

      const patients = await Promise.all(
        uniquePatientIds.map(async (uid) => {
          const usersRef = collection(this.firestore, 'usuarios');
          const q = query(usersRef, where('uid', '==', uid));
          const querySnapshot = await getDocs(q);
          const data = querySnapshot.docs[0].data();
          return {
            uid,
            nombre: data?.['nombre'],
            apellido: data?.['apellido'],
            email: data?.['email'],
          } as Patient;
        })
      );
      this.patients = patients;
      console.log('pacientes', this.patients);
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  }

  convertTimestampToDate(timestamp: any): Date {
    return timestamp?.toDate ? timestamp.toDate() : timestamp;
  }

  private async loadSpecialties() {
    try {
      const specialtiesDocRef = doc(
        this.firestore,
        'especialidades',
        'NZ4dfBtbH4V1WpRBCtHj'
      );
      const docSnapshot = await getDoc(specialtiesDocRef);

      if (docSnapshot.exists()) {
        this.specialties = docSnapshot.data()['nombres'] || [];
      }
    } catch (error) {
      console.error('Error loading specialties:', error);
    }
  }

  private async loadSpecialists() {
    try {
      const specialistsRef = collection(this.firestore, 'usuarios');
      const specialistsQuery = query(
        specialistsRef,
        where('perfil', '==', 'specialist')
      );

      const querySnapshot = await getDocs(specialistsQuery);
      this.specialists = querySnapshot.docs.map(
        (doc) =>
        ({
          uid: doc.id,
          ...doc.data(),
        } as Specialist)
      );
    } catch (error) {
      console.error('Error loading specialists:', error);
    }
  }
  getSpecialistName(uid: string): string {
    const specialist = this.specialists.find((s) => s.uid === uid);
    return specialist
      ? `${specialist.nombre} ${specialist.apellido}`
      : 'Especialista no encontrado';
  }

  filterBySpecialist(specialistId: string) {
    this.selectedSpecialist =
      this.selectedSpecialist === specialistId ? '' : specialistId;
    this.applyFilters();
  }

  filterBySpecialty(specialty: string) {
    this.selectedSpecialty =
      this.selectedSpecialty === specialty ? '' : specialty;
    this.applyFilters();
  }

  filterByPatient(patientId: string) {
    this.selectedPatient = this.selectedPatient === patientId ? '' : patientId;
    this.applyFilters();
  }

  private applyFilters() {
    this.filteredAppointments = this.appointments.filter((appointment) => {

  
      // Filtrado por especialidad
      const matchSpecialty =
        !this.selectedSpecialty || appointment.especialidad === this.selectedSpecialty;
  
      // Filtrado por paciente
      const matchPatient =
        !this.selectedPatient || appointment.uidPaciente === this.selectedPatient;
  
      // Filtrado por especialista
      const matchSpecialist =
        !this.selectedSpecialist || appointment.uidEspecialista === this.selectedSpecialist;
  
      // Filtrado por datos específicos (altura, peso, temperatura, presión)
      const matchSpecificData =
        !this.specificDataFilter ||
        appointment.altura?.toString().includes(this.specificDataFilter) ||
        appointment.peso?.toString().includes(this.specificDataFilter) ||
        appointment.temperatura?.toString().includes(this.specificDataFilter) ||
        appointment.presion?.toString().includes(this.specificDataFilter);
  
      // Filtrado por datos dinámicos
      const matchDynamicData =
        !this.specificDataFilter ||
        appointment.datosDinamicos?.some((item) => {
          const claveLower = item.clave ? item.clave.trim().toLowerCase() : ''; // Normalizamos la clave
          const valorLower = item.valor ? item.valor.toString().trim().toLowerCase() : ''; // Normalizamos el valor
  
          // Búsqueda en clave o valor
          const isClaveMatch = claveLower.includes(this.specificDataFilter.toLowerCase());
          const isValorMatch = valorLower.includes(this.specificDataFilter.toLowerCase());
  
  
          return isClaveMatch || isValorMatch; // Devolver true si coincide con clave o valor
        });
  
      // Evaluación final: Combinación de todos los filtros
      const finalMatch = (this.selectedSpecialty ? matchSpecialty : true) &&
                         (this.selectedPatient ? matchPatient : true) &&
                         (this.selectedSpecialist ? matchSpecialist : true) &&((this.specificDataFilter ? matchSpecificData : true) ||
                         (this.specificDataFilter ? matchDynamicData : true))
                         ;
  
  
      return finalMatch;
    });
  

  }
  
  
  
  
  
  filterBySpecificData(searchValue: string) {
    this.specificDataFilter = searchValue.toLowerCase();
    this.applyFilters();

    
  }


  getPatientName(uid: string): string {
    const patient = this.patients.find((p) => p.uid === uid);
    return patient
      ? `${patient.nombre} ${patient.apellido}`
      : 'Paciente no encontrado';
  }

  async openCancelModal(appointment: Appointment) {
    this.selectedAppointment = appointment;
    this.modalTitle = 'Cancelar Turno';
    this.modalAction = 'cancel';
    this.showModal = true;
    this.commentForm.reset();
  }

  async openRejectModal(appointment: Appointment) {
    this.selectedAppointment = appointment;
    this.modalTitle = 'Rechazar Turno';
    this.modalAction = 'reject';
    this.showModal = true;
    this.commentForm.reset();
  }

  async openFinishModal(appointment: Appointment) {
    this.selectedAppointment = appointment;
    this.modalTitle = 'Finalizar Turno';
    this.modalAction = 'finish';
    this.showModal = true;
    this.diagnosisForm.reset();
  }

  async openReviewModal(appointment: Appointment) {
    this.selectedAppointment = appointment;
    this.dinamicos = this.selectedAppointment.datosDinamicos
    this.modalTitle = 'Ver Reseña';
    this.modalAction = 'view';
    this.showModal = true;
    this.ratingForm.reset();
    console.log("aca", this.selectedAppointment.datosDinamicos);
  }
  async openRateModal(appointment: Appointment) {
    this.selectedAppointment = appointment;
    this.modalTitle = 'Calificar Atencion';
    this.modalAction = 'rate';
    this.showModal = true;


  }
  async acceptAppointment(appointment: Appointment) {
    try {
      const appointmentRef = doc(this.firestore, 'turnos', appointment.id!);
      await updateDoc(appointmentRef, {
        status: AppointmentStatus.ACCEPTED,
      });

      await Swal.fire({
        title: 'Turno aceptado',
        text: 'El turno ha sido aceptado exitosamente',
        icon: 'success',
        timer: 2000,
      });

      await this.loadAppointments();
    } catch (error) {
      console.error('Error accepting appointment:', error);
      await Swal.fire({
        title: 'Error',
        text: 'No se pudo aceptar el turno',
        icon: 'error',
      });
    }
  }

  async submitModal() {
    if (!this.selectedAppointment?.id) return;

    try {
      const appointmentRef = doc(
        this.firestore,
        'turnos',
        this.selectedAppointment.id
      );

      switch (this.modalAction) {
        case 'cancel':
          if (!this.commentForm.valid) return;
          await updateDoc(appointmentRef, {
            status: AppointmentStatus.CANCELLED,
            comentarioCancelacion: this.commentForm.get('comment')?.value,
          });
          break;

        case 'reject':
          if (!this.commentForm.valid) return;
          await updateDoc(appointmentRef, {
            status: AppointmentStatus.REJECTED,
            comentarioRechazo: this.commentForm.get('comment')?.value,
          });
          break;

        case 'finish':
          if (!this.diagnosisForm.valid) return;

          let dynamicData = [];


          if (this.diagnosisForm.get('clave0')?.value) {
            dynamicData.push( {
              clave: this.diagnosisForm.get('clave0')?.value,
              valor: this.diagnosisForm.get('valor0')?.value,
            })
          }
          if (this.diagnosisForm.get('clave1')?.value) {
            dynamicData.push( {
              clave: this.diagnosisForm.get('clave1')?.value,
              valor: this.diagnosisForm.get('valor1')?.value,
            })
          }if (this.diagnosisForm.get('clave2')?.value) {
            dynamicData.push( {
              clave: this.diagnosisForm.get('clave2')?.value,
              valor: this.diagnosisForm.get('valor2')?.value,
            })
          }

          // Realizar el update con todos los datos del formulario y los datos dinámicos formateados
          await updateDoc(appointmentRef, {
            status: AppointmentStatus.COMPLETED,
            diagnostico: this.diagnosisForm.get('diagnosis')?.value,
            resena: this.diagnosisForm.get('review')?.value,
            altura: this.diagnosisForm.get('altura')?.value,
            peso: this.diagnosisForm.get('peso')?.value,
            temperatura: this.diagnosisForm.get('temperatura')?.value,
            presion: this.diagnosisForm.get('presion')?.value,
            datosDinamicos: dynamicData, // Array de objetos clave-valor formateado
          });
          break;
        case 'rate':
          await updateDoc(appointmentRef, {
            calificacion: this.ratingForm.get('rating')?.value,
            comentarioAtencion: this.ratingForm.get('comment')?.value
          });
          break;
      }

      await Swal.fire({
        title: 'Acción completada',
        text: 'La operación se realizó exitosamente',
        icon: 'success',
        timer: 2000,
      });

      this.closeModal();
      await this.loadAppointments();
    } catch (error) {
      console.error('Error processing action:', error);
      await Swal.fire({
        title: 'Error',
        text: 'No se pudo procesar la acción',
        icon: 'error',
      });
    }
  }

  closeModal() {
    this.showModal = false;
    this.selectedAppointment = null;
    this.commentForm.reset();
    this.diagnosisForm.reset();
  }

  // Visibility control methods for specialist actions
  canCancelAppointment(appointment: Appointment): boolean {
    return this.isSpecialist
      ? appointment.status === AppointmentStatus.ACCEPTED
      : appointment.status !== AppointmentStatus.COMPLETED &&
      appointment.status !== AppointmentStatus.REJECTED &&
      appointment.status !== AppointmentStatus.CANCELLED;
  }

  canRejectAppointment(appointment: Appointment): boolean {
    return this.isSpecialist && appointment.status == AppointmentStatus.PENDING;
  }

  canAcceptAppointment(appointment: Appointment): boolean {
    return this.isSpecialist && appointment.status == AppointmentStatus.PENDING;
  }
  canReviewAppointment(appointment: Appointment): boolean {
    return (
      !this.isSpecialist &&
      appointment.status == AppointmentStatus.COMPLETED &&
      appointment.calificacion == ''
    );
  }
  canFinishAppointment(appointment: Appointment): boolean {
    return (
      this.isSpecialist && appointment.status === AppointmentStatus.ACCEPTED
    );
  }

  hasReview(appointment: Appointment): boolean {
    return (
      !!appointment.resena ||
      !!appointment.comentarioCancelacion ||
      !!appointment.comentarioRechazo
    );
  }
}