import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';
import {
  Auth,
  createUserWithEmailAndPassword,
  Unsubscribe,
} from '@angular/fire/auth';
import { Router } from '@angular/router';
import {
  Firestore,
  collection,
  addDoc
} from '@angular/fire/firestore';
import {
  Storage,
  ref,
  uploadBytes,
  getDownloadURL
} from '@angular/fire/storage';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.css'
})
export class RegistroComponent {
  registrationForm: FormGroup;
  errorMessage?: string;
  authSubscription?: Unsubscribe;
  userType: 'patient' | 'specialist' = 'patient';
  imageFiles: File[] = [];
  specialties: string[] = ['Cardiología', 'Dermatología', 'Pediatría', 'Traumatología'];
  newSpecialty: string = '';
  isLoading = false;

  private auth = inject(Auth);
  private router = inject(Router);
  private firestore = inject(Firestore);
  private storage = inject(Storage);
  private fb = inject(FormBuilder);

  constructor() {
    this.registrationForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      edad: ['', [Validators.required, Validators.min(18), Validators.max(120)]],
      dni: ['', [Validators.required, Validators.pattern('^[0-9]{8}$')]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      // Campos específicos para pacientes
      obraSocial: [''],
      // Campos específicos para especialistas
      especialidad: [''],
      newSpecialty: ['']
    });
  }

  ngOnInit() {
    this.authSubscription = this.auth.onAuthStateChanged((auth) => {
      if (auth?.email) {
        this.router.navigateByUrl('');
      }
    });

    // Actualizar validaciones según el tipo de usuario
    this.updateFormValidations();
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription();
    }
  }

  updateFormValidations() {
    if (this.userType === 'patient') {
      this.registrationForm.get('obraSocial')?.setValidators([Validators.required]);
      this.registrationForm.get('especialidad')?.clearValidators();
    } else {
      this.registrationForm.get('especialidad')?.setValidators([Validators.required]);
      this.registrationForm.get('obraSocial')?.clearValidators();
    }
    this.registrationForm.updateValueAndValidity();
  }

  onUserTypeChange(type: 'patient' | 'specialist') {
    this.userType = type;
    this.updateFormValidations();
    this.imageFiles = [];
  }

  async onFileSelected(event: any, index: number) {
    if (event.target.files && event.target.files[0]) {
      this.imageFiles[index] = event.target.files[0];
    }
  }

  addSpecialty() {
    if (this.newSpecialty && !this.specialties.includes(this.newSpecialty)) {
      this.specialties.push(this.newSpecialty);
      this.registrationForm.patchValue({ especialidad: this.newSpecialty });
      this.newSpecialty = '';
    }
  }

  async uploadImage(file: File, userId: string, index: number): Promise<string> {
    const filePath = `profiles/${userId}/profile${index + 1}`;
    const fileRef = ref(this.storage, filePath);
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  }

  async registro() {
    if (this.registrationForm.invalid) {
      this.errorMessage = 'Por favor, complete todos los campos requeridos correctamente.';
      return;
    }

    if ((this.userType === 'patient' && this.imageFiles.length !== 2) ||
        (this.userType === 'specialist' && this.imageFiles.length !== 1)) {
      this.errorMessage = 'Por favor, suba todas las imágenes requeridas.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      // 1. Crear usuario en Authentication
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        this.registrationForm.get('email')?.value,
        this.registrationForm.get('password')?.value
      );

      // 2. Subir imágenes al Storage
      const imageUrls: string[] = [];
      for (let i = 0; i < this.imageFiles.length; i++) {
        const url = await this.uploadImage(this.imageFiles[i], userCredential.user.uid, i);
        imageUrls.push(url);
      }

      // 3. Guardar datos en Firestore
      const userData = {
        uid: userCredential.user.uid,
        nombre: this.registrationForm.get('nombre')?.value,
        apellido: this.registrationForm.get('apellido')?.value,
        edad: this.registrationForm.get('edad')?.value,
        dni: this.registrationForm.get('dni')?.value,
        email: this.registrationForm.get('email')?.value,
        perfil: this.userType,
        imageUrls: imageUrls,
        fechaRegistro: new Date().toISOString(),
        ...(this.userType === 'patient' ? {
          obraSocial: this.registrationForm.get('obraSocial')?.value
        } : {
          especialidad: this.registrationForm.get('especialidad')?.value
        })
      };

      await addDoc(collection(this.firestore, 'usuarios'), userData);

      this.router.navigate(['/home']);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        this.errorMessage = 'El correo electrónico ya está en uso. Por favor, use otro.';
      } else {
        this.errorMessage = 'Ocurrió un error. Por favor, intente nuevamente.';
      }
      console.error('Error en el registro:', error);
    } finally {
      this.isLoading = false;
    }
  }
}