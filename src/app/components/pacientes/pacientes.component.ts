import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  collection, 
  getDocs, 
  Firestore, 
  query,
  where,
  Timestamp
} from '@angular/fire/firestore';
import { Auth, onAuthStateChanged, User } from '@angular/fire/auth';

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
  calificacion:string
}

interface Paciente {
  uid: string;
  nombre: string;
  apellido: string;
  edad: number;
  email: string;
  turnos: Turno[];
  imagen:string
}

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pacientes.component.html',
  styleUrl: './pacientes.component.css'
})
export class PacientesComponent implements OnInit {
  pacientes: Paciente[] = [];
  expandedIndexes: Set<number> = new Set();
  isLoading: boolean = true;
  
  constructor(
    private firestore: Firestore,
    private auth: Auth
  ) {
  }

  ngOnInit() {
    this.isLoading = true;
    onAuthStateChanged(this.auth, async (user) => {
      if (user) {
        await this.loadPacientes(user);
      }
      this.isLoading = false;
    });
  }

  async loadPacientes(user: User) {
    const especialistaUid = user.uid;
    
    if (!especialistaUid) {
      console.error('No hay usuario autenticado');
      return;
    }

    try {
      // Obtener todos los turnos del especialista que estén completados
      const turnosRef = collection(this.firestore, 'turnos');
      const q = query(
        turnosRef,
        where('uidEspecialista', '==', especialistaUid),
        where('status', '==', 'COMPLETADO')
      );
      
      const turnosSnapshot = await getDocs(q);
      const turnos = turnosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha: doc.data()['fecha'] instanceof Timestamp 
          ? doc.data()['fecha'].toDate() 
          : new Date(doc.data()['fecha'])
      })) as Turno[];

      // Agrupar turnos por paciente
      const pacienteMap = new Map<string, Turno[]>();
      turnos.forEach(turno => {
        const turnos = pacienteMap.get(turno.uidPaciente) || [];
        turnos.push(turno);
        pacienteMap.set(turno.uidPaciente, turnos);
      });

      // Obtener información de los pacientes
      const pacientesRef = collection(this.firestore, 'usuarios');
      const pacientesPromises = Array.from(pacienteMap.keys()).map(async (uid) => {
        const pacienteQuery = query(pacientesRef, where('uid', '==', uid));
        const pacienteSnapshot = await getDocs(pacienteQuery);
        const pacienteData = pacienteSnapshot.docs[0]?.data();
        
        if (pacienteData) {
          console.log(pacienteData);
          
          return {
            uid: pacienteData['uid'],
            nombre: pacienteData['nombre'],
            apellido: pacienteData['apellido'],
            edad: pacienteData['edad'],
            email: pacienteData['email'],
            turnos: pacienteMap.get(uid)?.sort((a, b) => b.fecha.getTime() - a.fecha.getTime()) || [],
            imagen: pacienteData['imageUrls'][0], // Accede al primer elemento de imageUrls
        };
        }
        return null;
      });

      const pacientes = (await Promise.all(pacientesPromises))
        .filter((p): p is Paciente => p !== null)
        .sort((a, b) => a.apellido.localeCompare(b.apellido));

      this.pacientes = pacientes;
    } catch (error) {
      console.error('Error al cargar pacientes:', error);
    }
  }

  hasDatosDinamicos(datosDinamicos: DatoDinamico[]): boolean {
    if (!datosDinamicos) return false;
    return datosDinamicos.some(dato => dato.clave !== null && dato.valor !== null);
  }

  isExpanded(index: number): boolean {
    return this.expandedIndexes.has(index);
  }

  toggleExpand(index: number) {
    if (this.expandedIndexes.has(index)) {
      this.expandedIndexes.delete(index);
    } else {
      this.expandedIndexes.add(index);
    }
  }
  formatTime(time: string): string {
    const hour = parseInt(time);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:00 ${ampm}`;
  }
}