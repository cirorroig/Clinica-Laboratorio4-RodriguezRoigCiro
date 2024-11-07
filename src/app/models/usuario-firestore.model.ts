export interface UsuarioFirestore {
    nombre: string;
    apellido: string;
    edad: number;
    dni: string;
    mail: string;
    perfil: 'patient' | 'specialist' | 'admin';
    obraSocial?: string;
    especialidad?: string;
    uid: string;
  }
  