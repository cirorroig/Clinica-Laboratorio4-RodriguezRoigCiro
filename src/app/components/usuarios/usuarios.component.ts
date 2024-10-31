import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  Firestore 
} from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { Auth, createUserWithEmailAndPassword, sendEmailVerification } from '@angular/fire/auth';
import { FirebaseApp, initializeApp } from '@angular/fire/app';
import { getAuth } from 'firebase/auth';

interface User {
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

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css']
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
  specialties: string[] = ['Cardiología', 'Dermatología', 'Pediatría', 'Traumatología'];
  newSpecialty: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  isLoading = false;
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

    this.secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
    this.secondaryAuth = getAuth(this.secondaryApp);
  }

  ngOnInit() {
    this.loadUsers();
  }

  createBaseForm(): FormGroup<BaseFormControls> {
    return this.fb.group<BaseFormControls>({
      nombre: this.fb.control('', [Validators.required, Validators.minLength(2)]),
      apellido: this.fb.control('', [Validators.required, Validators.minLength(2)]),
      edad: this.fb.control('', [Validators.required, Validators.min(1), Validators.max(120)]),
      dni: this.fb.control('', [Validators.required, Validators.pattern('^[0-9]{8}$')]),
      email: this.fb.control('', [Validators.required, Validators.email]),
      password: this.fb.control('', [Validators.required, Validators.minLength(6)])
    });
  }

  createPatientForm(): FormGroup<PatientFormControls> {
    return this.fb.group<PatientFormControls>({
      ...this.createBaseForm().controls,
      obraSocial: this.fb.control('', Validators.required)
    });
  }

  createSpecialistForm(): FormGroup<SpecialistFormControls> {
    return this.fb.group<SpecialistFormControls>({
      ...this.createBaseForm().controls,
      especialidad: this.fb.control('', Validators.required)
    });
  }

  async loadUsers() {
    const usersCollection = collection(this.firestore, 'usuarios');
    const snapshot = await getDocs(usersCollection);
    this.users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as User
    }));
  }

  async toggleUserStatus(user: User) {
    if (user.id) {
      const userRef = doc(this.firestore, 'usuarios', user.id);
      await updateDoc(userRef, {
        habilitado: !user.habilitado
      });
      await this.loadUsers();
    }
  }

  async deleteUser(user: User) {
    if (user.id && confirm('¿Está seguro de eliminar este usuario?')) {
      const userRef = doc(this.firestore, 'usuarios', user.id);
      await deleteDoc(userRef);
      await this.loadUsers();
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
          fechaCreacion: new Date().toISOString()
        };
        delete userData.password;

        await addDoc(collection(this.firestore, 'usuarios'), userData);
        await this.secondaryAuth.signOut();

        this.successMessage = 'Administrador creado exitosamente.';
        this.showAdminModal = false;
        this.adminForm.reset();
        this.adminImageFile = null;
        await this.loadUsers();
      } catch (error: any) {
        console.error('Error al crear administrador:', error);
        this.errorMessage = error.code === 'auth/email-already-in-use' 
          ? 'El correo electrónico ya está en uso' 
          : 'Error al crear el administrador';
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
        
        const imageUrls = await Promise.all(this.patientImageFiles.map((file, index) => 
          this.uploadImage(file, `patient_${index}`)
        ));

        const userData = {
          uid: userCredential.user.uid,
          ...this.patientForm.value,
          perfil: 'patient',
          imageUrls,
          fechaRegistro: new Date().toISOString(),
          habilitado: true
        };
        delete userData.password;
        await addDoc(collection(this.firestore, 'usuarios'), userData);
        await this.secondaryAuth.signOut();

        this.successMessage = 'Paciente registrado exitosamente';
        this.showPatientModal = false;
        this.patientForm.reset();
        this.patientImageFiles = [];
        await this.loadUsers();
      } catch (error: any) {
        console.error('Error al registrar paciente:', error);
        this.errorMessage = error.code === 'auth/email-already-in-use' 
          ? 'El correo electrónico ya está en uso' 
          : 'Error al registrar el paciente';
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
        
        const imageUrl = await this.uploadImage(this.specialistImageFile, 'specialist');
        const userData = {
          uid: userCredential.user.uid,
          ...this.specialistForm.value,
          perfil: 'specialist',
          imageUrls: [imageUrl],
          fechaRegistro: new Date().toISOString(),
          habilitado: false
        };
        delete userData.password;
        await addDoc(collection(this.firestore, 'usuarios'), userData);
        await this.secondaryAuth.signOut();

        this.successMessage = 'Especialista registrado exitosamente. Pendiente de habilitación.';
        this.showSpecialistModal = false;
        this.specialistForm.reset();
        this.specialistImageFile = null;
        await this.loadUsers();
      } catch (error: any) {
        console.error('Error al registrar especialista:', error);
        this.errorMessage = error.code === 'auth/email-already-in-use' 
          ? 'El correo electrónico ya está en uso' 
          : 'Error al registrar el especialista';
      } finally {
        this.isLoading = false;
      }
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
}