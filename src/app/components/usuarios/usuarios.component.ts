import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormControl,
} from '@angular/forms';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  Firestore,
  query,
  where,
  Timestamp,
} from '@angular/fire/firestore';
import {
  Storage,
  ref,
  uploadBytes,
  getDownloadURL,
} from '@angular/fire/storage';
import {
  Auth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from '@angular/fire/auth';
import { FirebaseApp, initializeApp } from '@angular/fire/app';
import { getAuth } from 'firebase/auth';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

interface User {
  uid: string;
  id?: string;
  nombre: string;
  apellido: string;
  edad: number;
  dni: string;
  email: string;
  perfil: 'admin' | 'patient' | 'specialist';
  habilitado?: boolean;
  especialidad?: string;
  imageUrls?: Array<string>;
  obraSocial?: string;
}

interface BaseFormControls {
  nombre: FormControl<string | null>;
  apellido: FormControl<string | null>;
  edad: FormControl<string | null>;
  dni: FormControl<string | null>;
  email: FormControl<string | null>;
  password: FormControl<string | null>;
}

interface PatientFormControls extends BaseFormControls {
  obraSocial: FormControl<string | null>;
}

interface SpecialistFormControls extends BaseFormControls {
  especialidad: FormControl<string | null>;
}

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
  especialista: string;
}

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css'],
})
export class UsuariosComponent implements OnInit {
  users: User[] = [];
  showAdminModal = false;
  showPatientModal = false;
  showSpecialistModal = false;
  adminForm: FormGroup<BaseFormControls>;
  patientForm: FormGroup<PatientFormControls>;
  specialistForm: FormGroup<SpecialistFormControls>;
  adminImageFile: File | null = null;
  patientImageFiles: File[] = [];
  specialistImageFile: File | null = null;
  specialties: string[] = [
    'Cardiología',
    'Dermatología',
    'Pediatría',
    'Traumatología',
  ];
  newSpecialty: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  isLoading = false;

  showHistorialModal = false;
  selectedUserHistorial: Turno[] = [];
  loadingHistorial = false;
  selectedUserName = '';

  private secondaryApp: FirebaseApp;
  private secondaryAuth: Auth;

  constructor(
    private firestore: Firestore,
    private storage: Storage,
    private auth: Auth,
    private fb: FormBuilder
  ) {
    this.adminForm = this.createBaseForm();
    this.patientForm = this.createPatientForm();
    this.specialistForm = this.createSpecialistForm();

    // Inicializar segunda instancia de Firebase
    const firebaseConfig = {
      projectId: 'clinica-rodriguezroig-ciro',
      appId: '1:295037508816:web:86d37a30135dd5f60b12d5',
      storageBucket: 'clinica-rodriguezroig-ciro.appspot.com',
      apiKey: 'AIzaSyDr373PT9NskA0F3hjYPuzEaf3DHoxEHeA',
      authDomain: 'clinica-rodriguezroig-ciro.firebaseapp.com',
      messagingSenderId: '295037508816',
    };

    this.secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
    this.secondaryAuth = getAuth(this.secondaryApp);
  }

  ngOnInit() {
    this.loadUsers();
  }
  downloadUsersExcel() {
    // Preparar los datos para el Excel
    const excelData = this.users.map((user) => ({
      Nombre: user.nombre,
      Apellido: user.apellido,
      Edad: user.edad,
      DNI: user.dni,
      Email: user.email,
      Perfil: user.perfil,
      Estado:
        user.perfil === 'specialist'
          ? user.habilitado
            ? 'Habilitado'
            : 'Deshabilitado'
          : 'N/A',
      Especialidad:
        user.perfil === 'admin'
          ? 'Administrador'
          : user.perfil === 'specialist'
          ? 'Especialista'
          : 'Paciente',
      'Obra Social': user.obraSocial || 'N/A',
    }));

    // Crear el libro de trabajo
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios');

    // Generar el archivo
    XLSX.writeFile(workbook, 'usuarios_clinica.xlsx');
  }
  createBaseForm(): FormGroup<BaseFormControls> {
    return this.fb.group<BaseFormControls>({
      nombre: this.fb.control('', [
        Validators.required,
        Validators.minLength(2),
      ]),
      apellido: this.fb.control('', [
        Validators.required,
        Validators.minLength(2),
      ]),
      edad: this.fb.control('', [
        Validators.required,
        Validators.min(1),
        Validators.max(120),
      ]),
      dni: this.fb.control('', [
        Validators.required,
        Validators.pattern('^[0-9]{8}$'),
      ]),
      email: this.fb.control('', [
        Validators.required,
        Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$'),
      ]),
      password: this.fb.control('', [
        Validators.required,
        Validators.minLength(6),
      ]),
    });
  }

  createPatientForm(): FormGroup<PatientFormControls> {
    return this.fb.group<PatientFormControls>({
      ...this.createBaseForm().controls,
      obraSocial: this.fb.control('', Validators.required),
    });
  }

  createSpecialistForm(): FormGroup<SpecialistFormControls> {
    return this.fb.group<SpecialistFormControls>({
      ...this.createBaseForm().controls,
      especialidad: this.fb.control('', Validators.required),
    });
  }

  async loadUsers() {
    const usersCollection = collection(this.firestore, 'usuarios');
    const snapshot = await getDocs(usersCollection);
    this.users = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as User),
    }));
  }
  async verHistorial(user: User) {

    this.loadingHistorial = true;
    this.showHistorialModal = true;
    this.selectedUserName = `${user.nombre} ${user.apellido}`;
    this.selectedUserHistorial = [];

    try {
      const turnosRef = collection(this.firestore, 'turnos');
      const q = query(
        turnosRef,
        where('uidPaciente', '==', user.uid),
        where('status', '==', 'COMPLETADO'),
        where('altura', '!=', null)
      );

      const querySnapshot = await getDocs(q);

      // Esperamos la resolución de todas las promesas con Promise.all
      this.selectedUserHistorial = await Promise.all(
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
          console.log(especialistaNombre);
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
      this.selectedUserHistorial.sort(
        (a, b) => b.fecha.getTime() - a.fecha.getTime()
      );
    } catch (error) {
      console.error('Error al cargar el historial clínico:', error);
      await Swal.fire({
        title: 'Error',
        text: 'No se pudo cargar el historial clínico',
        icon: 'error',
      });
    } finally {
      this.loadingHistorial = false;
    }
  }

  hasDatosDinamicosValidos(datosDinamicos: DatoDinamico[]): boolean {
    if (!datosDinamicos) return false;
    return datosDinamicos.some(
      (dato) => dato.clave !== null && dato.valor !== null
    );
  }

  closeHistorialModal() {
    this.showHistorialModal = false;
    this.selectedUserHistorial = [];
    this.selectedUserName = '';
  }
  async toggleUserStatus(user: User) {
    if (user.id) {
      const result = await Swal.fire({
        title: `¿${user.habilitado ? 'Deshabilitar' : 'Habilitar'} usuario?`,
        text: `¿Está seguro que desea ${
          user.habilitado ? 'deshabilitar' : 'habilitar'
        } a ${user.nombre} ${user.apellido}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: user.habilitado ? 'Deshabilitar' : 'Habilitar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: user.habilitado ? '#d33' : '#3085d6',
      });

      if (result.isConfirmed) {
        try {
          const userRef = doc(this.firestore, 'usuarios', user.id);
          await updateDoc(userRef, {
            habilitado: !user.habilitado,
          });
          await this.loadUsers();

          await Swal.fire({
            title: '¡Actualizado!',
            text: `El usuario ha sido ${
              user.habilitado ? 'deshabilitado' : 'habilitado'
            } correctamente`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
          });
        } catch (error) {
          await Swal.fire({
            title: 'Error',
            text: 'No se pudo actualizar el estado del usuario',
            icon: 'error',
          });
        }
      }
    }
  }

  async deleteUser(user: User) {
    if (user.id) {
      const result = await Swal.fire({
        title: '¿Eliminar usuario?',
        text: `¿Está seguro de eliminar a ${user.nombre} ${user.apellido}? Esta acción no se puede deshacer.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
      });

      if (result.isConfirmed) {
        try {
          const userRef = doc(this.firestore, 'usuarios', user.id);
          await deleteDoc(userRef);
          await this.loadUsers();

          await Swal.fire({
            title: '¡Eliminado!',
            text: 'El usuario ha sido eliminado correctamente',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
          });
        } catch (error) {
          await Swal.fire({
            title: 'Error',
            text: 'No se pudo eliminar el usuario',
            icon: 'error',
          });
        }
      }
    }
  }

  async createAdmin() {
    if (this.adminForm.valid && this.adminImageFile) {
      this.isLoading = true;
      this.errorMessage = '';
      try {
        const userCredential = await createUserWithEmailAndPassword(
          this.secondaryAuth,
          this.adminForm.get('email')?.value ?? '',
          this.adminForm.get('password')?.value ?? ''
        );

        const imageUrl = await this.uploadImage(this.adminImageFile, 'admin');

        const userData = {
          uid: userCredential.user.uid,
          ...this.adminForm.value,
          perfil: 'admin',
          habilitado: true,
          imageUrls: [imageUrl],
          fechaCreacion: new Date().toISOString(),
        };
        delete userData.password;

        await addDoc(collection(this.firestore, 'usuarios'), userData);
        await this.secondaryAuth.signOut();

        await Swal.fire({
          title: '¡Éxito!',
          text: 'Administrador creado exitosamente',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });

        this.showAdminModal = false;
        this.adminForm.reset();
        this.adminImageFile = null;
        await this.loadUsers();
      } catch (error: any) {
        console.error('Error al crear administrador:', error);
        await Swal.fire({
          title: 'Error',
          text:
            error.code === 'auth/email-already-in-use'
              ? 'El correo electrónico ya está en uso'
              : 'Error al crear el administrador',
          icon: 'error',
        });
      } finally {
        this.isLoading = false;
      }
    }
  }

  async registerPatient() {
    if (this.patientForm.valid && this.patientImageFiles.length === 2) {
      this.isLoading = true;
      this.errorMessage = '';
      try {
        const userCredential = await createUserWithEmailAndPassword(
          this.secondaryAuth,
          this.patientForm.get('email')?.value ?? '',
          this.patientForm.get('password')?.value ?? ''
        );
        await sendEmailVerification(userCredential.user);

        const imageUrls = await Promise.all(
          this.patientImageFiles.map((file, index) =>
            this.uploadImage(file, `patient_${index}`)
          )
        );

        const userData = {
          uid: userCredential.user.uid,
          ...this.patientForm.value,
          perfil: 'patient',
          imageUrls,
          fechaRegistro: new Date().toISOString(),
          habilitado: true,
        };
        delete userData.password;
        await addDoc(collection(this.firestore, 'usuarios'), userData);
        await this.secondaryAuth.signOut();

        await Swal.fire({
          title: '¡Éxito!',
          text: 'Paciente registrado exitosamente',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });

        this.showPatientModal = false;
        this.patientForm.reset();
        this.patientImageFiles = [];
        await this.loadUsers();
      } catch (error: any) {
        console.error('Error al registrar paciente:', error);
        await Swal.fire({
          title: 'Error',
          text:
            error.code === 'auth/email-already-in-use'
              ? 'El correo electrónico ya está en uso'
              : 'Error al registrar el paciente',
          icon: 'error',
        });
      } finally {
        this.isLoading = false;
      }
    }
  }

  async registerSpecialist() {
    if (this.specialistForm.valid && this.specialistImageFile) {
      this.isLoading = true;
      this.errorMessage = '';
      try {
        const userCredential = await createUserWithEmailAndPassword(
          this.secondaryAuth,
          this.specialistForm.get('email')?.value ?? '',
          this.specialistForm.get('password')?.value ?? ''
        );
        await sendEmailVerification(userCredential.user);

        const imageUrl = await this.uploadImage(
          this.specialistImageFile,
          'specialist'
        );
        const userData = {
          uid: userCredential.user.uid,
          ...this.specialistForm.value,
          perfil: 'specialist',
          imageUrls: [imageUrl],
          fechaRegistro: new Date().toISOString(),
          habilitado: false,
        };
        delete userData.password;
        await addDoc(collection(this.firestore, 'usuarios'), userData);
        await this.secondaryAuth.signOut();

        await Swal.fire({
          title: '¡Éxito!',
          text: 'Especialista registrado exitosamente. Pendiente de habilitación.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });

        this.showSpecialistModal = false;
        this.specialistForm.reset();
        this.specialistImageFile = null;
        await this.loadUsers();
      } catch (error: any) {
        console.error('Error al registrar especialista:', error);
        await Swal.fire({
          title: 'Error',
          text:
            error.code === 'auth/email-already-in-use'
              ? 'El correo electrónico ya está en uso'
              : 'Error al registrar el especialista',
          icon: 'error',
        });
      } finally {
        this.isLoading = false;
      }
    }
  }

  onAdminFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.adminImageFile = file;
    }
  }

  onPatientFileSelected(event: any, index: number) {
    const file = event.target.files[0];
    if (file) {
      this.patientImageFiles[index] = file;
    }
  }

  onSpecialistFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.specialistImageFile = file;
    }
  }

  async uploadImage(file: File, prefix: string): Promise<string> {
    const filePath = `profiles/${prefix}_${Date.now()}`;
    const fileRef = ref(this.storage, filePath);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  }

  addSpecialty() {
    if (this.newSpecialty && !this.specialties.includes(this.newSpecialty)) {
      this.specialties.push(this.newSpecialty);
      this.specialistForm.patchValue({ especialidad: this.newSpecialty });
      this.newSpecialty = '';
    }
  }

  resetForms() {
    this.adminForm.reset();
    this.patientForm.reset();
    this.specialistForm.reset();
    this.adminImageFile = null;
    this.patientImageFiles = [];
    this.specialistImageFile = null;
    this.errorMessage = '';
    this.successMessage = '';
  }

  openAdminModal() {
    this.resetForms();
    this.showAdminModal = true;
  }

  openPatientModal() {
    this.resetForms();
    this.showPatientModal = true;
  }

  openSpecialistModal() {
    this.resetForms();
    this.showSpecialistModal = true;
  }
  async descargarHistorialPDF(user: User) {
    try {
      this.loadingHistorial = true;
      const turnosRef = collection(this.firestore, 'turnos');
      const q = query(
        turnosRef,
        where('uidPaciente', '==', user.uid),
        where('status', '==', 'COMPLETADO')
      );
  
      const querySnapshot = await getDocs(q);
      const turnos = await (await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const data = doc.data();

          // Consulta para obtener el nombre y apellido del especialista
          const usuariosRef = collection(this.firestore, 'usuarios');
          const espQuery = query(
            usuariosRef,
            where('uid', '==', data['uidEspecialista'])
          );
          const espSnapshot = await getDocs(espQuery);

          let especialistaNombre = '';
          if (!espSnapshot.empty) {
            const espData = espSnapshot.docs[0].data();
            especialistaNombre = `${espData['nombre']} ${espData['apellido']}`;
          }

          return {
            ...data,
            id: doc.id,
            especialista: especialistaNombre, // Nombre y apellido del especialista
            fecha: data['fecha'] instanceof Timestamp
              ? data['fecha'].toDate()
              : new Date(data['fecha']),
          } as Turno;
        })
      )).sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

      const pdf = new jsPDF();
      let yPos = 20;

      // Título
      pdf.setFontSize(16);
      pdf.text(`Historial Clínico - ${user.nombre} ${user.apellido}`, 20, yPos);
      
      yPos += 20;
      pdf.setFontSize(12);

      for (const turno of turnos) {
        // Verificar si necesitamos una nueva página
        if (yPos > 250) {
          pdf.addPage();
          yPos = 20;
        }

        const fecha = new Date(turno.fecha).toLocaleDateString();
        pdf.setFont("helvetica", "bold");
        pdf.text(`Fecha: ${fecha} - Hora: ${turno.hora}:00 - ${turno.especialidad}`, 20, yPos);
        yPos += 10;

        // Nombre del especialista
        pdf.text(`Especialista: ${turno.especialista}`, 20, yPos);
        yPos += 10;

        pdf.setFont("helvetica", "normal");
        if (turno.altura) {
          pdf.text(`Altura: ${turno.altura} cm`, 30, yPos);
          yPos += 7;
        }
        if (turno.peso) {
          pdf.text(`Peso: ${turno.peso} kg`, 30, yPos);
          yPos += 7;
        }
        if (turno.temperatura) {
          pdf.text(`Temperatura: ${turno.temperatura}°C`, 30, yPos);
          yPos += 7;
        }
        if (turno.presion) {
          pdf.text(`Presión: ${turno.presion}`, 30, yPos);
          yPos += 7;
        }

        if (turno.datosDinamicos && this.hasDatosDinamicosValidos(turno.datosDinamicos)) {
          pdf.setFont("helvetica", "bold");
          pdf.text("Datos Adicionales:", 20, yPos);
          yPos += 7;
          pdf.setFont("helvetica", "normal");
          
          for (const dato of turno.datosDinamicos) {
            if (dato.clave && dato.valor) {
              pdf.text(`${dato.clave}: ${dato.valor}`, 30, yPos);
              yPos += 7;
            }
          }
        }

        if (turno.diagnostico) {
          pdf.setFont("helvetica", "bold");
          pdf.text("Diagnóstico:", 20, yPos);
          yPos += 7;
          pdf.setFont("helvetica", "normal");
          pdf.text(turno.diagnostico, 30, yPos);
          yPos += 7;
        }

        if (turno.comentarioAtencion) {
          pdf.setFont("helvetica", "bold");
          pdf.text("Comentarios:", 20, yPos);
          yPos += 7;
          pdf.setFont("helvetica", "normal");
          pdf.text(turno.comentarioAtencion, 30, yPos);
          yPos += 7;
        }

        yPos += 10; // Espacio entre turnos
      }

      pdf.save(`historial_${user.apellido}_${user.nombre}.pdf`);

      await Swal.fire({
        title: '¡Éxito!',
        text: 'Historial descargado correctamente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error al descargar el historial:', error);
      await Swal.fire({
        title: 'Error',
        text: 'No se pudo descargar el historial clínico',
        icon: 'error'
      });
    } finally {
      this.loadingHistorial = false;
    }
}

}
