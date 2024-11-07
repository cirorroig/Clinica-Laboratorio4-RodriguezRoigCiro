import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
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
  where 
} from '@angular/fire/firestore';
import Swal from 'sweetalert2';

enum AppointmentStatus {
  PENDING = 'PENDIENTE',
  ACCEPTED = 'ACEPTADO',
  REJECTED = 'RECHAZADO',
  COMPLETED = 'COMPLETADO',
  CANCELLED = 'CANCELADO',
}

interface Appointment {
  id?: string;
  nombrePaciente: string;
  uidPaciente: string;
  uidEspecialista: string;
  fecha: Date;
  hora: number;
  asignado: boolean;
  status: AppointmentStatus;
  especialidad: string;
  comentarioCancelacion?: string;
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
  selector: 'app-turnos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './turnos.component.html',
  styleUrls: ['./turnos.component.css']
})
export class TurnosComponent implements OnInit {
  appointments: Appointment[] = [];
  filteredAppointments: Appointment[] = [];
  specialists: Specialist[] = [];
  specialties: string[] = [];
  selectedSpecialty: string = '';
  selectedSpecialist: string = '';
  showModal = false;
  selectedAppointment: Appointment | null = null;

  cancelForm = new FormGroup({
    comment: new FormControl('', Validators.required)
  });

  constructor(private firestore: Firestore) {}

  async ngOnInit() {
    await this.loadAppointments();
    await this.loadSpecialties();
    await this.loadSpecialists();
  }

  private async loadAppointments() {
    try {
      const appointmentsRef = collection(this.firestore, 'turnos');
      const querySnapshot = await getDocs(appointmentsRef);
      
      const appointmentsPromises = querySnapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data() as Appointment;
        
        // Load patient name
        if (data.uidPaciente) {
          const usersRef = collection(this.firestore, 'usuarios');
          const patientQuery = query(usersRef, where('uid', '==', data.uidPaciente));
          const patientSnapshot = await getDocs(patientQuery);
          
          if (!patientSnapshot.empty) {
            const patientData = patientSnapshot.docs[0].data();
            data.nombrePaciente = `${patientData?.['nombre']} ${patientData?.['apellido']}`;
          }
        }
        
        return {
          id: docSnapshot.id,
          ...data,
          fecha: data.fecha || new Date()
        } as Appointment;
      });

      this.appointments = await Promise.all(appointmentsPromises);
      this.filteredAppointments = [...this.appointments];
    } catch (error) {
      console.error('Error loading appointments:', error);
      await Swal.fire({
        title: 'Error',
        text: 'No se pudieron cargar los turnos',
        icon: 'error'
      });
    }
  }

  private async loadSpecialties() {
    try {
      const specialtiesDocRef = doc(this.firestore, 'especialidades', 'NZ4dfBtbH4V1WpRBCtHj');
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
      const specialistsQuery = query(specialistsRef, where('perfil', '==', 'specialist'));
      
      const querySnapshot = await getDocs(specialistsQuery);
      this.specialists = querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      } as Specialist));
    } catch (error) {
      console.error('Error loading specialists:', error);
    }
  }

  getSpecialistName(uid: string): string {
    const specialist = this.specialists.find(s => s.uid === uid);
    return specialist ? `${specialist.nombre} ${specialist.apellido}` : 'Especialista no encontrado';
  }

  filterBySpecialist(specialistId: string) {
    this.selectedSpecialist = this.selectedSpecialist === specialistId ? '' : specialistId;
    this.applyFilters();
  }

  filterBySpecialty(specialty: string) {
    this.selectedSpecialty = this.selectedSpecialty === specialty ? '' : specialty;
    this.applyFilters();
  }

  private applyFilters() {
    this.filteredAppointments = this.appointments.filter(appointment => {
      const matchSpecialty = !this.selectedSpecialty || appointment.especialidad === this.selectedSpecialty;
      const matchSpecialist = !this.selectedSpecialist || appointment.uidEspecialista === this.selectedSpecialist;
      return matchSpecialty && matchSpecialist;
    });
  }

  convertTimestampToDate(timestamp: any): Date {
    return timestamp?.toDate ? timestamp.toDate() : timestamp;
  }

  canCancelAppointment(appointment: Appointment): boolean {
    return appointment.status !== AppointmentStatus.COMPLETED && 
           appointment.status !== AppointmentStatus.REJECTED && 
      appointment.status !== AppointmentStatus.ACCEPTED
      && 
      appointment.status !== AppointmentStatus.CANCELLED;
  }

  async openCancelModal(appointment: Appointment) {
    this.selectedAppointment = appointment;
    this.showModal = true;
    this.cancelForm.reset();
  }

  async submitCancelForm() {
    if (!this.selectedAppointment?.id || !this.cancelForm.valid) return;

    try {
      const appointmentRef = doc(this.firestore, 'turnos', this.selectedAppointment.id);
      await updateDoc(appointmentRef, {
        status: AppointmentStatus.CANCELLED,
        comentarioCancelacion: this.cancelForm.get('comment')?.value
      });

      await Swal.fire({
        title: 'Turno cancelado',
        text: 'El turno ha sido cancelado exitosamente',
        icon: 'success',
        timer: 2000
      });

      this.closeModal();
      await this.loadAppointments();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      await Swal.fire({
        title: 'Error',
        text: 'No se pudo cancelar el turno',
        icon: 'error'
      });
    }
  }

  closeModal() {
    this.showModal = false;
    this.selectedAppointment = null;
    this.cancelForm.reset();
  }
}