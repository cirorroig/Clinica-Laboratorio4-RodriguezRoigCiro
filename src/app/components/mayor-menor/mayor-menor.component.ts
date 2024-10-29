import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mayor-menor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mayor-menor.component.html',
  styleUrls: ['./mayor-menor.component.css']
})
export class MayorMenorComponent implements OnInit {
  cartas: string[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  palos: string[] = ['♠️', '♥️', '♦️', '♣️'];
  cartaIzquierda: string = '';
  cartaDerecha: string = '';
  cartaDerechaOculta: boolean = true;
  puntos: number = 0;
  mensaje: string = '';
  esAcierto: boolean = false;

  ngOnInit() {
    this.nuevasCartas();
  }

  nuevasCartas() {
    this.cartaIzquierda = this.cartaDerecha || this.obtenerCartaAleatoria();
    this.cartaDerecha = this.obtenerCartaAleatoria();
    this.cartaDerechaOculta = true;
    this.mensaje = '';
  }

  obtenerCartaAleatoria(): string {
    const carta = this.cartas[Math.floor(Math.random() * this.cartas.length)];
    const palo = this.palos[Math.floor(Math.random() * this.palos.length)];
    return carta + palo;
  }

  adivinar(esMayor: boolean) {
    this.cartaDerechaOculta = false;
    const valorIzquierda = this.obtenerValor(this.cartaIzquierda);
    const valorDerecha = this.obtenerValor(this.cartaDerecha);
    
    if (valorDerecha === valorIzquierda) {
      this.puntos++;
      this.mensaje = '¡Las cartas son iguales! Has ganado un punto.';
      this.esAcierto = true;
    } else if ((esMayor && valorDerecha > valorIzquierda) || (!esMayor && valorDerecha < valorIzquierda)) {
      this.puntos++;
      this.mensaje = '¡Correcto! Has ganado un punto.';
      this.esAcierto = true;
    } else {
      this.puntos = 0;
      this.mensaje = 'Incorrecto. Se ha reseteado tu puntuación.';
      this.esAcierto = false;
    }

    setTimeout(() => this.nuevasCartas(), 1500);
  }

  obtenerValor(carta: string): number {
    const valor = carta.slice(0, -2);
    switch (valor) {
      case 'A': return 1;
      case 'J': return 11;
      case 'Q': return 12;
      case 'K': return 13;
      default: return parseInt(valor);
    }
  }

  esCartaRoja(carta: string): boolean {
    return carta.endsWith('♥️') || carta.endsWith('♦️');
  }
}