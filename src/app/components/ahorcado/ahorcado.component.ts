import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ahorcado',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ahorcado.component.html',
  styleUrls: ['./ahorcado.component.css']
})
export class AhorcadoComponent implements OnInit {
  palabras: string[] = [
    'MANZANA', 'PERA', 'NARANJA', 'BANANA', 'FRESA',
    'UVA', 'CIRUELA', 'KIWI', 'MELON', 'PEPINO',
    'LECHUGA', 'ZANAHORIA', 'PATATA', 'TOMATE', 'CEBOLLA'
  ];
  

  palabra: string = '';
  palabraAdivinada: string[] = [];
  letras: string[] = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');
  letrasUsadas: Set<string> = new Set();
  intentosMaximos: number = 6;
  intentosRestantes: number = this.intentosMaximos;
  mensaje: string = '';
  partesCuerpo: string[] = ['cabeza', 'torso', 'brazo-izq', 'brazo-der', 'pierna-izq', 'pierna-der'];

  ngOnInit() {
    this.iniciarJuego();
  }

  iniciarJuego() {
    this.palabra = this.palabras[Math.floor(Math.random() * this.palabras.length)];
    this.palabraAdivinada = Array(this.palabra.length).fill('_');
    this.intentosRestantes = this.intentosMaximos;
    this.mensaje = '';
    this.letrasUsadas.clear();
  }

  adivinarLetra(letra: string) {
    if (this.letrasUsadas.has(letra)) return;
    
    this.letrasUsadas.add(letra);
    if (this.palabra.includes(letra)) {
      for (let i = 0; i < this.palabra.length; i++) {
        if (this.palabra[i] === letra) {
          this.palabraAdivinada[i] = letra;
        }
      }
      if (!this.palabraAdivinada.includes('_')) {
        this.mensaje = '¡Felicidades! ¡Has ganado!';
      }
    } else {
      this.intentosRestantes--;
      if (this.intentosRestantes === 0) {
        this.mensaje = `¡Juego terminado! La palabra era ${this.palabra}`;
      }
    }
  }

  estaLetraDeshabilitada(letra: string): boolean {
    return this.letrasUsadas.has(letra) || this.intentosRestantes === 0 || this.mensaje.includes('Felicidades');
  }

  reiniciarJuego() {
    this.iniciarJuego();
  }

  mostrarParteCuerpo(parte: string): boolean {
    return this.intentosMaximos - this.intentosRestantes >= this.partesCuerpo.indexOf(parte) + 1;
  }
}