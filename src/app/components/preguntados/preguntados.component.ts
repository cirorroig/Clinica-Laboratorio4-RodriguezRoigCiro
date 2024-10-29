import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PreguntadosService, Pregunta } from '../../preguntados.service';
import { ImagenesService } from '../../imagenes.service';

@Component({
  selector: 'app-preguntados',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './preguntados.component.html',
  styleUrls: ['./preguntados.component.css']
})
export class PreguntadosComponent implements OnInit {
  categorias: { nombre: string; color: string; apiCategoria: string }[] = [
    { nombre: 'Geografía', color: 'btn-primary', apiCategoria: 'geography' },
    { nombre: 'Historia', color: 'btn-danger', apiCategoria: 'history' },
    { nombre: 'Entretenimiento', color: 'btn-warning', apiCategoria: 'entertainment' },
    { nombre: 'Deportes y ocio', color: 'btn-success', apiCategoria: 'sports%26leisure' }
  ];

  preguntas: Pregunta[] = [];
  preguntaActual: Pregunta | null = null;
  respuestasMezcladas: string[] = [];
  mostrarResultado: boolean = false;
  esCorrecto: boolean = false;
  puntaje: number = 0;
  categoriaSeleccionada: string | null = null;
  imagenUrl: string | null = null;
  mostrarCategorias: boolean = true;
  preguntaActualIndex: number = 0;
  totalPreguntas: number = 0;

  constructor(private preguntadosService: PreguntadosService, private imagenesService: ImagenesService) {}

  ngOnInit() {}

  seleccionarCategoria(categoria: { nombre: string; apiCategoria: string }) {
    this.categoriaSeleccionada = categoria.nombre;
    this.mostrarCategorias = false;
    this.preguntaActualIndex = 0;
    this.puntaje = 0;
    
    this.preguntadosService.getQuestionsByCategory(categoria.apiCategoria).then(
      (preguntas: Pregunta[]) => {
        if (preguntas.length > 0) {
          this.preguntas = preguntas;
          this.totalPreguntas = preguntas.length;
          this.mostrarPregunta();
          this.mostrarResultado = false;
        } else {
          console.warn('No se encontraron preguntas para la categoría seleccionada.');
        }
      },
      (error) => {
        console.error('Error al obtener la pregunta:', error);
      }
    );
  }

  mostrarPregunta() {
    if (this.preguntaActualIndex < this.preguntas.length) {
      this.preguntaActual = this.preguntas[this.preguntaActualIndex];
      this.mezclarRespuestas();
      this.obtenerImagen(this.preguntaActual.category);
    } else {
      console.warn('No hay más preguntas en esta categoría.');
      this.mostrarCategorias = true;
    }
  }

  mezclarRespuestas() {
    if (this.preguntaActual) {
      this.respuestasMezcladas = [
        this.preguntaActual.correctAnswers,
        ...this.preguntaActual.incorrectAnswers
      ].sort(() => Math.random() - 0.5);
    }
  }

  verificarRespuesta(respuestaSeleccionada: string) {
    if (this.preguntaActual) {
      this.esCorrecto = respuestaSeleccionada === this.preguntaActual.correctAnswers;
      this.mostrarResultado = true;

      if (this.esCorrecto) {
        this.puntaje++;
      }

      setTimeout(() => {
        this.mostrarResultado = false;
        this.preguntaActualIndex++;
        this.mostrarPregunta();
      }, 2000);
    }
  }

  obtenerImagen(categoria: string) {
    this.imagenesService.getImages(categoria).subscribe((data) => {
      if (data && data.photos && data.photos.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.photos.length);
        this.imagenUrl = data.photos[randomIndex].src.original;
      }
    }, (error) => {
      console.error('Error al obtener la imagen:', error);
    });
  }

  volverACategorias() {
    this.mostrarCategorias = true;
    this.categoriaSeleccionada = null;
    this.preguntaActual = null;
    this.imagenUrl = null;
  }

  get progreso(): number {
    return (this.preguntaActualIndex / this.totalPreguntas) * 100;
  }
}