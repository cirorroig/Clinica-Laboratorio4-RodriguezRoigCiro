import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PreguntadosService {

  private apiUrl = 'https://api.quiz-contest.xyz/questions'; // URL base de la API
  private apiKey = '$2b$12$6o6k7b2iBnKQmCVCGz.aqetCGdlHnN.39/UWQqeli.sFGKQ8En0f2'; // Inserta tu API Key aquí

  constructor() { }

  // Método para obtener preguntas por categoría
  async getQuestionsByCategory(category: string): Promise<Pregunta[]> {
    const url = `${this.apiUrl}?limit=40&page=1&category=${category}`; // Añadimos la categoría a la URL

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error('Error en la solicitud');
    }

    const data = await response.json();
    return data.questions; // Devolvemos el array de preguntas
  }
}

// Interfaz de Pregunta para tipar los datos
export interface Pregunta {
  id: string;
  category: string;
  format: string;
  question: string;
  correctAnswers: string; // Cambiamos esto a string para que coincida con los datos
  incorrectAnswers: string[];
}
