import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  EventEmitter,
  Output,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  collectionData,
} from '@angular/fire/firestore';
import { addDays, format, eachDayOfInterval, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { trigger, transition, style, animate } from '@angular/animations';

interface DayAvailability {
  date: Date;
  isAvailable: boolean;
  dayName: string;
}

@Component({
  selector: 'app-date-picker-simulado',
  templateUrl: './date-picker-simulado.component.html',
  styleUrls: ['./date-picker-simulado.component.css'],
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('400ms ease-in', style({ opacity: 1 }))
      ])
    ])
  ]
})
export class DatePickerSimuladoComponent implements OnInit, OnChanges {
  @Input() specialistUid: string = ''; // UID del especialista
  @Input() loggedInUserUid: string = ''; // UID del usuario logueado
  @Output() appointmentSelected = new EventEmitter<{
    date: Date;
    time: number;
    userUid: string;
  }>();

  displayDays: DayAvailability[] = [];
  selectedDay?: DayAvailability;
  selectedTime?: number;

  availableTimes: number[] = [];
  availableDays: string[] = [];
  workingHours: number[] = [];
  takenDates: string[] = []; // Array para almacenar fechas tomadas

  constructor(private firestore: Firestore) {}

  ngOnInit(): void {
    if (this.specialistUid) {
      this.fetchAvailability();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['specialistUid'] && this.specialistUid) {
      this.fetchAvailability();
    }
  }

  private fetchAvailability(): void {
    const availabilityCollection = collection(this.firestore, 'disponibilidad');
    const availabilityQuery = query(
      availabilityCollection,
      where('uid', '==', this.specialistUid)
    );

    collectionData(availabilityQuery).subscribe((availability: any[]) => {
      if (availability.length > 0) {
        const avail = availability[0];
        this.availableDays = avail.dias || [];
        this.workingHours = avail.horarios || [];
        this.takenDates = avail.fechasTomadas || []; // Cargar fechas tomadas
        console.log(this.takenDates[0]);
        
        this.updateAvailableDays();
      }
    });
  }

  private updateAvailableDays(): void {
    const today = startOfDay(new Date());
    const endDate = addDays(today, 15);
    const daysInterval = eachDayOfInterval({ start: today, end: endDate });

    this.displayDays = daysInterval.map((date) => {
      const dayName = format(date, 'EEEE', { locale: es });
      const isAvailable = this.availableDays.includes(
        this.capitalizeFirstLetter(dayName)
      );

      // Verificar si todos los horarios del día están ocupados
      const allTimesTaken = this.workingHours.every((time) => {
        // Formatear la fecha y hora de manera consistente
        const dateString = format(date, 'dd/MM/yyyy') + ` ${time}:00`;
        console.log(dateString);
        
        console.log(this.takenDates.includes(dateString));
        return this.takenDates.includes(dateString);
      });

      // Bloquear el día si todos los horarios están ocupados
      return {
        date,
        isAvailable: isAvailable && !allTimesTaken,
        dayName: this.formatDate(date), // Esta función puedes dejarla para el nombre de día
      };
    });
}


private filterAvailableTimes(): void {
  if (this.selectedDay) {
    this.availableTimes = this.workingHours.filter((time) => {
      // Formatear la fecha y hora de manera consistente
      const newDateTime = format(this.selectedDay!.date, 'dd/MM/yyyy') + ` ${time}:00`;
      return !this.takenDates.includes(newDateTime); // Filtrar horarios ya ocupados
    });
  }
}


  formatDate(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }

  private capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  selectDate(day: DayAvailability): void {
    if (day.isAvailable) {
      this.selectedDay = day;
      this.filterAvailableTimes(); // Filtrar horarios disponibles al seleccionar un día
      this.selectedTime = undefined; // Restablecer el tiempo seleccionado
    }
  }

  selectTime(time: number): void {
    if (this.selectedDay) {
      this.selectedTime = time; // Guarda el tiempo seleccionado
      this.appointmentSelected.emit({
        date: this.selectedDay.date,
        time,
        userUid: this.loggedInUserUid,
      });
    }
  }

  trackByDate(index: number, day: DayAvailability): number {
    return day.date.getTime();
  }
}
