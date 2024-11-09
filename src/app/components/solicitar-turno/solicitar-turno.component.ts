import { Component, inject, OnInit } from '@angular/core';
import {
  Firestore,
  collectionData,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  setDoc,
  runTransaction,
} from '@angular/fire/firestore';
import { UsuarioFirestore } from '../../models/usuario-firestore.model';
import { CommonModule } from '@angular/common';
import { DatePickerSimuladoComponent } from '../date-picker-simulado/date-picker-simulado.component';
import { format } from 'date-fns';
import Swal from 'sweetalert2';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { trigger, transition, style, animate } from '@angular/animations';
import { Router } from '@angular/router';


interface Specialist {
  uid: string;
  nombre: string;
  apellido: string;
  especialidades: string[];
  email: string;
  imageUrl?: string;
}




@Component({
  selector: 'app-solicitar-turno',
  templateUrl: './solicitar-turno.component.html',
  standalone: true,
  imports: [CommonModule, DatePickerSimuladoComponent],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateY(-20px)' }))
      ])
    ])
  ],
  styleUrls:["./solicitar-turno.component.css"]
})
export class SolicitarTurnoComponent implements OnInit {
  specialties: string[] = [];
  specialists: Specialist[] = [];
  selectedSpecialty?: string;
  selectedSpecialist?: Specialist;
  selectedDate?: Date;
  selectedTime?: number;
  loggedInUserUid: string = ''; // Esta propiedad se inicializa
  auth: any;
  isAdmin: boolean = false; // To track if the user is admin
  patients: UsuarioFirestore[] = []; // To hold the list of patients
  filteredSpecialties: string[] = [];
  private router = inject(Router);
  constructor(private firestore: Firestore) { }

  async ngOnInit() {
    await this.loadSpecialists();
    await this.loadSpecialties()
    console.log(this.specialists);
    console.log(this.specialties);
    
    this.getLoggedInUserUid(); // Llama a la función para obtener el UID del usuario
    console.log(this.patients);
    
  }
  getSpecialtyImage(specialty: string): string {
    // Puedes añadir la lógica para asociar una imagen a cada especialidad
    const specialtyImages: { [key: string]: string } = {
      'Cardiología': 'cardiologia.svg',
      'Pediatría': 'pediatria.svg',
      'Otorrino': 'otorrino.svg',
      'Traumatología': 'traumatologia.svg',
      'Oftalmología': 'oftalmologia.svg',
      'Dermatología': 'dermatologia.svg',
    };
  
    return specialtyImages[specialty] || "default.svg";
  }
  
  // Función para obtener el UID del usuario autenticado
  private getLoggedInUserUid(): void {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.loggedInUserUid = user.uid;
        await this.checkIfAdmin(user.uid); // Check if the user is an admin
      }
    });
  }

  private async checkIfAdmin(uid: string): Promise<void> {
    const usersRef = collection(this.firestore, 'usuarios');
    const q = query(usersRef, where('uid', '==', uid));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      this.isAdmin = userData['perfil'] === 'admin'; // Set isAdmin based on user data

      if (this.isAdmin) {
        this.loadPatients(); // Load patients if the user is an admin
        
      }
    }
  }

  private loadPatients(): void {
    const patientsRef = collection(this.firestore, 'usuarios');
    const q = query(patientsRef, where('perfil', '==', 'patient')); // Assuming 'patient' is the profile for patients
    collectionData(q).subscribe(
      (patients: UsuarioFirestore[]) => {        
        this.patients = patients; // Assign the fetched patients to the patients property
        console.log("pacientes",this.patients);
        
      }
    );
  }

  async loadSpecialties(): Promise<void> {
    try {
      // Reference to the specific document containing specialties
      const specialtiesDocRef = doc(this.firestore, 'especialidades', 'NZ4dfBtbH4V1WpRBCtHj');
      const specialtiesDoc = await getDoc(specialtiesDocRef);
      
      if (specialtiesDoc.exists()) {
        const data = specialtiesDoc.data();
        // Access the 'nombres' array from the document
        this.specialties = data['nombres'] || [];
      } else {
        console.error('Specialties document not found');
        this.specialties = [];
      }
    } catch (error) {
      console.error('Error loading specialties:', error);
      this.specialties = [];
    }
  }

  
  async loadSpecialists() {
    try {
      const specialistsRef = collection(this.firestore, 'usuarios');
      const specialistsQuery = query(
        specialistsRef,
        where('perfil', '==', 'specialist')
      );
  
      const querySnapshot = await getDocs(specialistsQuery);
      
      this.specialists = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        console.log(data);
        return {
          uid: data['uid'],
          nombre: data['nombre'],
          apellido: data['apellido'],
          especialidades: data['especialidades'],
          email: data['email'],
          imageUrl: data['imageUrls'][0]// Tomamos solo la primera URL de imagen
        } as Specialist;
      });
    } catch (error) {
      console.error('Error loading specialists:', error);
    }
  }
  
  onSpecialtySelect(specialty: string): void {
    this.selectedSpecialty = specialty;
  }
  

  onSpecialistSelect(specialist: Specialist): void {
    this.selectedSpecialist = specialist;
    this.selectedSpecialty = undefined; // Limpiamos la especialidad seleccionada previamente
    // Filtrar especialidades según las que tenga el especialista en su array
    this.filteredSpecialties = this.specialties.filter(specialty => specialist.especialidades.includes(specialty));
  }
  
  onPatientSeleccion(event: Event): void {
    const selectElement = event.target as HTMLSelectElement; // Asegúrate de que target es un HTMLSelectElement
    const patientUid = selectElement.value; // Ahora puedes acceder a la propiedad value sin problemas

    if (patientUid) {
      console.log('UID del paciente seleccionado:', patientUid); // Verifica el UID
      this.loggedInUserUid = patientUid; // Establece el UID del paciente seleccionado
    } else {
      console.warn('El UID del paciente no está definido'); // Manejo de errores
    }
  }
  
  // Method to handle emitted appointment data
  onAppointmentSelected(appointment: { date: Date; time: number }): void {
    this.selectedDate = appointment.date;
    this.selectedTime = appointment.time;
  }

  // Method to submit appointment (currently only logging)
  submitAppointment(): void {
    // Check that all data is available before showing the alert
    if (this.selectedDate && this.selectedTime && this.selectedSpecialist) {
      // Show confirmation alert
      Swal.fire({
        title: 'Confirmar Turno',
        text: `Estás seguro de confirmar el turno con ${
          this.selectedSpecialist.nombre
        } ${this.selectedSpecialist.apellido} para el ${this.formatDate(
          this.selectedDate
        )} a las ${this.selectedTime}:00 hs?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, confirmar',
        cancelButtonText: 'Cancelar',
      }).then((result) => {
        if (result.isConfirmed) {
          // If the user confirms, store the appointment in Firestore
          this.storeAppointment();
        }
      });
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Por favor, asegúrate de haber seleccionado todos los datos necesarios para confirmar el turno.',
      });
    }
  }

  private formatDate(date: Date): string {
    return format(date, 'dd/MM/yyyy'); // Adjust the format according to your needs
  }

 
  private async storeAppointment(): Promise<void> {
    try {

      const appointmentData = {

        uidPaciente: this.loggedInUserUid,
        uidEspecialista: this.selectedSpecialist?.uid,
        fecha: this.selectedDate,
        hora: this.selectedTime,
        asignado: true,
        status: "PENDIENTE",
        comentarioCancelacion: "",
        comentarioRechazo: "",
        resena: "",
        calificacion: "",
        comentarioAtencion: "",
        diagnostico: "",
        createdAt: new Date(), // Timestamp de creación
        especialidad: this.selectedSpecialty,
        
        // Datos fijos de la historia clínica
        altura: null, // Altura del paciente
        peso: null,   // Peso del paciente
        temperatura: null, // Temperatura del paciente
        presion: null, // Presión del paciente
      
        // Datos dinámicos de la historia clínica
        datosDinamicos: []
      };
      

      const appointmentsCollection = collection(this.firestore, 'turnos');
      
      // Use the formatted ID as the document ID
      const appointmentDocRef = doc(appointmentsCollection);
      await setDoc(appointmentDocRef, appointmentData);

      // Update specialist's availability
      await this.updateSpecialistAvailability();

      if (this.selectedDate) {
        const formattedDate = this.formatDate(this.selectedDate);
        await Swal.fire({
          icon: 'success',
          title: 'Turno confirmado',
          text: `Turno confirmado para ${formattedDate} a las ${this.selectedTime}:00 hs.`,
        });
        if (this.isAdmin) {
          this.router.navigate(["/turnos"])

        } else {
          
          this.router.navigate(["/misTurnos"])
        }

      }
    } catch (error) {
      console.error('Error al registrar el turno: ', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Hubo un problema al registrar el turno. Intenta nuevamente más tarde.',
      });
      throw error;
    }
  }


  private async updateSpecialistAvailability(): Promise<void> {
    // Get the availability collection and query for the selected specialist
    const availabilityCollection = collection(this.firestore, 'disponibilidad');
    const availabilityQuery = query(
      availabilityCollection,
      where('uid', '==', this.selectedSpecialist?.uid)
    );

    const querySnapshot = await getDocs(availabilityQuery);
    const availabilityDoc = querySnapshot.docs[0]; // Change from doc to availabilityDoc

    if (availabilityDoc && this.selectedDate) {
      // Ensure availabilityDoc and this.selectedDate are defined
      const disponibilidad = availabilityDoc.data();
      const fechasTomadas = disponibilidad['fechasTomadas'] || []; // Get the current array of taken dates

      // Add the new date and time to fechasTomadas
      const newDateTime = `${this.formatDate(this.selectedDate)} ${
        this.selectedTime
      }:00`;
      fechasTomadas.push(newDateTime);

      // Update the availability document
      const availabilityDocRef = doc(
        availabilityCollection,
        availabilityDoc.id
      ); // Use availabilityDoc.id instead of doc.id
      await updateDoc(availabilityDocRef, {
        fechasTomadas: fechasTomadas,
      });
    }
  }
}