import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  Auth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Firestore, collection, addDoc, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import {
  Storage,
  ref,
  uploadBytes,
  getDownloadURL,
} from '@angular/fire/storage';
import { CommonModule } from '@angular/common';
import { RECAPTCHA_SETTINGS, RecaptchaFormsModule, RecaptchaModule, RecaptchaSettings } from 'ng-recaptcha';
import { PasswordStrengthPipe } from '../../pipes/password-strength.pipe';
import { trigger, style, animate, transition, state } from '@angular/animations';

interface Availability {
  uid: string;
  dias: string[]; // Días seleccionados
  horarios: number[]; // Horarios de trabajo
  fechasTomadas: string[]; // Fechas que han sido reservadas
}

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule,RecaptchaModule,
    RecaptchaFormsModule,PasswordStrengthPipe],
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.css'],
  providers: [
    {
      provide: RECAPTCHA_SETTINGS,
      useValue: {
        siteKey: '6LeKc3UqAAAAABMGD1bJ5u0ZfPEu3zGS-zlW5bRG', // Replace with your actual site key
      } as RecaptchaSettings,
    },
  ],
  animations: [
    trigger('slideInOut', [
      state('void', style({
        transform: 'translateY(-100%)',
        opacity: 0
      })),
      state('*', style({
        transform: 'translateY(0)',
        opacity: 1
      })),
      transition(':enter', [
        animate('0.5s ease-out')
      ]),
      transition(':leave', [
        animate('0.5s ease-in')
      ])
    ]),
    trigger('fadeInOut', [
      state('void', style({
        opacity: 0
      })),
      transition(':enter', [
        animate('0.3s ease-out')
      ]),
      transition(':leave', [
        animate('0.3s ease-in')
      ])
    ])
  ]
})
export class RegistroComponent {
  registrationForm: FormGroup;
  errorMessage?: string;
  successMessage?: string;
  userType: 'patient' | 'specialist' = 'patient';
  imageFiles: File[] = [];
  specialties: string[] = [];
  selectedSpecialties: string[] = [];
  newSpecialty: string = '';
  isLoading = false;
  showForm = false;
  clave = '';
  daysAvailable: string[] = [];
  workingHours: { start: number; end: number } = { start: 9, end: 13 };

  private auth = inject(Auth);
  private router = inject(Router);
  private firestore = inject(Firestore);
  private storage = inject(Storage);
  private fb = inject(FormBuilder);

  
  constructor() {
    this.registrationForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      edad: ['', [Validators.required, Validators.min(1), Validators.max(120)]],
      dni: ['', [Validators.required, Validators.pattern('^[0-9]{8}$')]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      obraSocial: [''],
      especialidades: [[]],  // Changed to array
      newSpecialty: [''],
      daysAvailable: [[], [Validators.required]],
      workingHoursStart: [this.workingHours.start, [Validators.required]],
      workingHoursEnd: [this.workingHours.end, [Validators.required]],
      recaptcha: ['', Validators.required] // Add recaptcha control
    });
  }

  async ngOnInit() {
    await this.loadSpecialties();
  }

  async loadSpecialties() {
    try {
      const specialtiesDoc = await getDoc(doc(this.firestore, 'especialidades', 'NZ4dfBtbH4V1WpRBCtHj'));
      
      if (specialtiesDoc.exists()) {
        
        this.specialties = specialtiesDoc.data()['nombres'] || [];
        
      }
    } catch (error) {
      console.error('Error loading specialties:', error);
      this.errorMessage = 'Error al cargar las especialidades';
    }
  }

  toggleSpecialty(specialty: string) {
    const index = this.selectedSpecialties.indexOf(specialty);
    if (index === -1) {
      this.selectedSpecialties.push(specialty);
    } else {
      this.selectedSpecialties.splice(index, 1);
    }
    this.registrationForm.patchValue({ especialidades: this.selectedSpecialties });
  }

  async addSpecialty() {
    if (this.newSpecialty && !this.specialties.includes(this.newSpecialty)) {
      try {
        // Add to local arrays
        this.specialties.push(this.newSpecialty);
        this.selectedSpecialties.push(this.newSpecialty);
        
        // Update Firestore specialties collection
        const specialtiesRef = doc(this.firestore, 'especialidades', 'NZ4dfBtbH4V1WpRBCtHj');
        await updateDoc(specialtiesRef, {
          nombres: [...this.specialties]
        });
        
        // Update form value
        this.registrationForm.patchValue({ especialidades: this.selectedSpecialties });
        this.newSpecialty = '';
      } catch (error) {
        console.error('Error adding specialty:', error);
        this.errorMessage = 'Error al agregar la especialidad';
      }
    }
  }

  selectUserType(type: 'patient' | 'specialist') {
    this.userType = type;
    this.showForm = true;
    this.updateFormValidations();
  }

  updateFormValidations() {
    if (this.userType === 'patient') {
      this.registrationForm.get('obraSocial')?.setValidators([Validators.required]);
      this.registrationForm.get('especialidades')?.clearValidators();
      this.registrationForm.get('daysAvailable')?.clearValidators();
      this.registrationForm.get('workingHoursStart')?.clearValidators();
      this.registrationForm.get('workingHoursEnd')?.clearValidators();
    } else {
      this.registrationForm.get('especialidades')?.setValidators([Validators.required]);
      this.registrationForm.get('obraSocial')?.clearValidators();
      this.registrationForm.get('daysAvailable')?.setValidators([Validators.required]);
      this.registrationForm.get('workingHoursStart')?.setValidators([Validators.required]);
      this.registrationForm.get('workingHoursEnd')?.setValidators([Validators.required]);
    }
    this.registrationForm.updateValueAndValidity();
  }

  async onFileSelected(event: any, index: number) {
    if (event.target.files && event.target.files[0]) {
      this.imageFiles[index] = event.target.files[0];
    }
  }


  async uploadImage(
    file: File,
    userId: string,
    index: number
  ): Promise<string> {
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

    if (!this.registrationForm.get('recaptcha')?.value) {
      this.errorMessage = 'Por favor, complete el captcha.';
      return;
    }

    if (this.userType === 'specialist' && this.selectedSpecialties.length === 0) {
      this.errorMessage = 'Por favor, seleccione al menos una especialidad.';
      return;
    }

    if (
      (this.userType === 'patient' && this.imageFiles.length !== 2) ||
      (this.userType === 'specialist' && this.imageFiles.length !== 1)
    ) {
      this.errorMessage = 'Por favor, suba todas las imágenes requeridas.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        this.registrationForm.get('email')?.value,
        this.registrationForm.get('password')?.value
      );
      signOut(this.auth);

      await sendEmailVerification(userCredential.user);

      const imageUrls: string[] = [];
      for (let i = 0; i < this.imageFiles.length; i++) {
        const url = await this.uploadImage(
          this.imageFiles[i],
          userCredential.user.uid,
          i
        );
        imageUrls.push(url);
      }

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
        habilitado: this.userType === 'patient',
        ...(this.userType === 'patient'
          ? { obraSocial: this.registrationForm.get('obraSocial')?.value }
          : { especialidades: this.selectedSpecialties }), // Changed to array
          
      };

      await addDoc(collection(this.firestore, 'usuarios'), userData);

      if (this.userType === 'specialist') {
        const dias = this.registrationForm.get('daysAvailable')?.value;
        const horarios = this.generateHourlyArray(
          this.registrationForm.get('workingHoursStart')?.value,
          this.registrationForm.get('workingHoursEnd')?.value
        );

        const availabilityData: Availability = {
          uid: userCredential.user.uid,
          dias: dias,
          horarios: horarios,
          fechasTomadas: [],
        };

        await addDoc(collection(this.firestore, 'disponibilidad'), availabilityData);
      }

      this.successMessage = 'Registro exitoso. Por favor, verifica tu correo electrónico para poder iniciar sesión.';
      if (this.userType === 'specialist') {
        this.successMessage += ' Un administrador revisará y habilitará tu cuenta próximamente.';
      }
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
  private generateHourlyArray(startHour: number, endHour: number): number[] {
    const hours: number[] = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      hours.push(hour);
    }
    return hours;
  }

  onDayChange(day: string) {
    const index = this.daysAvailable.indexOf(day);
    if (index === -1) {
      // Si el día no está seleccionado, agregarlo
      this.daysAvailable.push(day);
    } else {
      // Si el día ya está seleccionado, quitarlo
      this.daysAvailable.splice(index, 1);
    }
    // Actualizar el valor del control del formulario
    this.registrationForm.patchValue({ daysAvailable: this.daysAvailable });
  }
  onRecaptchaResolved(token: string | null) {  // Updated type to accept null
    this.registrationForm.patchValue({ recaptcha: token });
  }
  onRecaptchaExpired() {
    this.registrationForm.patchValue({ recaptcha: null });
  }
}
