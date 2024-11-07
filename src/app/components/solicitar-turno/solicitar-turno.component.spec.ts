import { Component, OnInit } from '@angular/core';
import {
  Firestore,
  collectionData,
  collection,
  query,
  where,
} from '@angular/fire/firestore';
import { UsuarioFirestore } from '../../models/usuario-firestore.model';
import { CommonModule } from '@angular/common';
import { DatePickerSimuladoComponent } from '../date-picker-simulado/date-picker-simulado.component';

@Component({
  selector: 'app-solicitar-turno',
  templateUrl: './solicitar-turno.component.html',
  standalone: true,
  imports: [CommonModule, DatePickerSimuladoComponent],
})
export class SolicitarTurnoComponent implements OnInit {
[x: string]: any;
patients: any;

  specialties: string[] = [];
  specialists: UsuarioFirestore[] = [];
  selectedSpecialty?: string;
  selectedSpecialist?: UsuarioFirestore;
  selectedDate?: Date;
  selectedTime?: number;
  loggedInUserUid: string = 'USER_UID'; // Set this to the actual UID of the logged-in user
isAdmin: any;

  constructor(private firestore: Firestore) {}

  ngOnInit(): void {
    this.loadSpecialties();
  }

  loadSpecialties(): void {
    const specialistsCollection = collection(this.firestore, 'usuarios');
    collectionData(specialistsCollection, { idField: 'uid' }).subscribe(
      (usuarios: any[]) => {
        this.specialties = Array.from(
          new Set(
            usuarios
              .filter(
                (user) => user.especialidad && user.perfil === 'specialist'
              )
              .map((user) => user.especialidad)
          )
        );
      }
    );
  }

  onSpecialtySelect(specialty: string): void {
    this.selectedSpecialty = specialty;
    this.selectedSpecialist = undefined;
    this.loadSpecialists(specialty);
  }

  loadSpecialists(specialty: string): void {
    const specialistsCollection = collection(this.firestore, 'usuarios');
    const specialistsQuery = query(
      specialistsCollection,
      where('especialidad', '==', specialty),
      where('perfil', '==', 'specialist')
    );

    collectionData(specialistsQuery, { idField: 'uid' }).subscribe(
      (usuarios: any[]) => {
        this.specialists = usuarios;
      }
    );
  }

  onSpecialistSelect(specialist: UsuarioFirestore): void {
    this.selectedSpecialist = specialist;
  }

  // Method to handle emitted appointment data
  onAppointmentSelected(appointment: { date: Date; time: number; userUid: string }): void {
    this.selectedDate = appointment.date;
    this.selectedTime = appointment.time;
    const userUid = appointment.userUid;
    
    // Handle the appointment logic with the userUid if needed
  }

  // Method to submit appointment (currently only logging)
  submitAppointment(): void {
    console.log('Appointment data:', {
      specialty: this.selectedSpecialty,
      specialist: this.selectedSpecialist,
      date: this.selectedDate,
      time: this.selectedTime,
      userUid: this.loggedInUserUid,
    });
  }
}
