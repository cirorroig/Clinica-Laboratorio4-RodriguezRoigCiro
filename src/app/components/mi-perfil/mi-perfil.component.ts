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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  especialista:string
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


interface Specialist {
  uid: string;
  nombre: string;
  apellido: string;
  especialidades: string[];
  email: string;
  imageUrl?: string;
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
  specialists: Specialist[] = [];
  filteredSpecialists: Specialist[] = [];
  selectedSpecialistId: string | null = null;
  logo: HTMLImageElement | null = null;
  
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private fb = inject(FormBuilder);

  constructor() {
    this.availabilityForm = this.fb.group({
      dias: [[], [Validators.required]],
      horarioInicio: [8, [Validators.required]],
      horarioFin: [20, [Validators.required]],
    });
  
    // Precargar el logo
    this.logo = new Image();
    this.logo.src = '/logo.png';
  }

  async ngOnInit() {
    await this.loadSpecialists()
    console.log("especialistas",this.specialists);
    onAuthStateChanged(this.auth, async (user) => {
      if (user) {
        await this.loadUserData();
        if (this.userData?.perfil === 'patient') {
          await this.loadHistorialClinico();

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
        where('altura', '!=', null)
      );
  
      const querySnapshot = await getDocs(q);
  
      // Esperamos la resolución de todas las promesas con Promise.all
      this.historialClinico = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const data = doc.data();
  
          // Consulta para obtener el especialista usando uidEspecialista
          const usuariosRef = collection(this.firestore, 'usuarios');
          const espQuery = query(
            usuariosRef,
            where('uid', '==', data['uidEspecialista'])
          );
          const espSnapshot = await getDocs(espQuery);
  
          // Obtenemos el nombre y apellido del especialista
          let especialistaNombre = '';
          if (!espSnapshot.empty) {
            const espData = espSnapshot.docs[0].data();
            especialistaNombre = `${espData['nombre']} ${espData['apellido']}`;
          }
  
          return {
            ...data,
            id: doc.id,
            especialista: especialistaNombre, // Nombre y apellido del especialista
            fecha:
              data['fecha'] instanceof Timestamp
                ? data['fecha'].toDate()
                : new Date(data['fecha']),
          } as Turno;
        })
      );
  
      // Ordenamos los turnos por fecha de forma descendente
      this.historialClinico.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
      this.filterSpecialistsByHistory();
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
  private filterSpecialistsByHistory() {
    const specialistIds = new Set(this.historialClinico.map(turno => turno.uidEspecialista));
    this.filteredSpecialists = this.specialists.filter(specialist => 
      specialistIds.has(specialist.uid)
    );
    console.log(this.filteredSpecialists);
    
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
  private async addPDFHeader(doc: jsPDF, title: string) {
    return new Promise<number>((resolve) => {
      if (this.logo) {
        // Agregar logo
        doc.addImage(this.logo, 'PNG', 20, 10, 40, 40);
        
        // Título del informe
        doc.setFontSize(20);
        doc.text(title, 70, 30);
        
        // Fecha de emisión
        doc.setFontSize(12);
        doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, 70, 40);
        
        // Información del paciente
        if (this.userData) {
          doc.setFontSize(12);
          doc.text(`Paciente: ${this.userData.nombre} ${this.userData.apellido}`, 20, 60);
          doc.text(`DNI: ${this.userData.dni}`, 20, 70);
          doc.text(`Email: ${this.userData.email}`, 20, 80);
          if (this.userData.obraSocial) {
            doc.text(`Obra Social: ${this.userData.obraSocial}`, 20, 90);
          }
        }
        resolve(100); // Retorna la posición Y donde termina el encabezado
      } else {
        resolve(20);
      }
    });
  }
  
  private async addTurnoToPDF(doc: jsPDF, turno: Turno, yPos: number): Promise<number> {
    doc.setFontSize(14);
    doc.text(`Fecha: ${turno.fecha.toLocaleDateString()} - ${turno.hora}`, 20, yPos);
    doc.setFontSize(12);
    doc.text(`Especialidad: ${turno.especialidad}`, 20, yPos + 7);
    doc.text(`Especialista: ${turno.especialista}`, 20, yPos + 14);
  
    // Tabla de datos vitales
    const tableData = [
      ['Altura', 'Peso', 'Temperatura', 'Presión'],
      [
        `${turno.altura || '-'} cm`,
        `${turno.peso || '-'} kg`,
        `${turno.temperatura || '-'} °C`,
        turno.presion || '-'
      ]
    ];
  
    autoTable(doc, {
      startY: yPos + 20,
      head: [tableData[0]],
      body: [tableData[1]],
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 5 },
      margin: { left: 20 }
    });
  
    let currentY = (doc as any).lastAutoTable.finalY + 10;
  
    // Diagnóstico
    doc.setFontSize(12);
    doc.text('Diagnóstico:', 20, currentY);
    doc.setFontSize(10);
    const diagnosticoLines = doc.splitTextToSize(turno.diagnostico || 'No especificado', 170);
    doc.text(diagnosticoLines, 20, currentY + 5);
    
    currentY += 10 + (diagnosticoLines.length * 5);
  
    // Comentarios
    doc.setFontSize(12);
    doc.text('Comentarios:', 20, currentY);
    doc.setFontSize(10);
    const comentarioLines = doc.splitTextToSize(turno.comentarioAtencion || 'Sin comentarios', 170);
    doc.text(comentarioLines, 20, currentY + 5);
  
    return currentY + 20 + (comentarioLines.length * 5);
  }
  
  async generateFullHistoryPDF() {
    try {
      const doc = new jsPDF();
      let yPos = await this.addPDFHeader(doc, 'Historial Clínico Completo');
  
      // Ordenar turnos por fecha descendente
      const sortedTurnos = [...this.historialClinico].sort(
        (a, b) => b.fecha.getTime() - a.fecha.getTime()
      );
  
      for (let i = 0; i < sortedTurnos.length; i++) {
        const turno = sortedTurnos[i];
        
        // Verificar si necesitamos una nueva página
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
  
        yPos = await this.addTurnoToPDF(doc, turno, yPos);
        
        // Agregar línea separadora entre turnos
        if (i < sortedTurnos.length - 1) {
          doc.setDrawColor(200);
          doc.line(20, yPos, 190, yPos);
          yPos += 10;
        }
      }
  
      doc.save(`historial_clinico_completo_${this.userData?.apellido}.pdf`);
      
    } catch (error) {
      console.error('Error generando PDF completo:', error);
      this.errorMessage = 'Error al generar el PDF del historial completo';
    }
  }
  
  async generateSpecialistPDF(specialistId: string) {
    try {
      const specialist = this.specialists.find(s => s.uid === specialistId);
      if (!specialist) return;
  
      const doc = new jsPDF();
      let yPos = await this.addPDFHeader(doc, 
        `Historial de Atenciones - ${specialist.nombre} ${specialist.apellido}`);
  
      const specialistTurnos = this.historialClinico
        .filter(turno => turno.uidEspecialista === specialistId)
        .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  
      for (let i = 0; i < specialistTurnos.length; i++) {
        const turno = specialistTurnos[i];
        
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
  
        yPos = await this.addTurnoToPDF(doc, turno, yPos);
        
        if (i < specialistTurnos.length - 1) {
          doc.setDrawColor(200);
          doc.line(20, yPos, 190, yPos);
          yPos += 10;
        }
      }
  
      doc.save(`historial_${specialist.apellido}_${this.userData?.apellido}.pdf`);
      
    } catch (error) {
      console.error('Error generando PDF del especialista:', error);
      this.errorMessage = 'Error al generar el PDF del especialista';
    }
  }
}
