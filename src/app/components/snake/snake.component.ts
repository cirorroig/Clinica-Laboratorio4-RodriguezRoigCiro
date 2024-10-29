import { Component, ViewChild, ElementRef, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-snake',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './snake.component.html',
  styleUrls: ['./snake.component.css']
})
export class SnakeComponent implements OnInit {
  @ViewChild('lienzojuego', { static: true }) lienzojuego!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private serpiente: { x: number; y: number }[] = [];
  private comida: { x: number; y: number } = { x: 0, y: 0 };
  private direccion: string = 'derecha';
  private bucleJuego: any;
  private readonly tamanioCelda: number = 20;
  private readonly cantidadCeldas: number = 20;
  public puntuacion: number = 0;
  private estaPausado: boolean = false;
  public mostrarModal: boolean = false;

  ngOnInit() {
    this.ctx = this.lienzojuego.nativeElement.getContext('2d')!;
    this.inicializarJuego();
  }

  private inicializarJuego() {
    this.serpiente = [{ x: 10, y: 10 }];
    this.generarComida();
    this.direccion = 'derecha';
    this.puntuacion = 0;
    this.mostrarModal = false;
    this.estaPausado = false;
    this.dibujarJuego();
  }

  private generarComida() {
    this.comida = {
      x: Math.floor(Math.random() * this.cantidadCeldas),
      y: Math.floor(Math.random() * this.cantidadCeldas)
    };
  }

  @HostListener('window:keydown', ['$event'])
  manejarEventoTeclado(evento: KeyboardEvent) {
    if (this.mostrarModal) return;
    switch (evento.key) {
      case 'ArrowUp':
        if (this.direccion !== 'abajo') this.direccion = 'arriba';
        break;
      case 'ArrowDown':
        if (this.direccion !== 'arriba') this.direccion = 'abajo';
        break;
      case 'ArrowLeft':
        if (this.direccion !== 'derecha') this.direccion = 'izquierda';
        break;
      case 'ArrowRight':
        if (this.direccion !== 'izquierda') this.direccion = 'derecha';
        break;
    }
  }

  iniciarJuego() {
    this.inicializarJuego();
    if (this.bucleJuego) {
      clearInterval(this.bucleJuego);
    }
    this.bucleJuego = setInterval(() => this.logicaJuego(), 110);
  }

  pausarJuego() {
    this.estaPausado = !this.estaPausado;
  }

  private logicaJuego() {
    if (this.estaPausado) return;

    const cabeza = { ...this.serpiente[0] };

    switch (this.direccion) {
      case 'arriba': cabeza.y--; break;
      case 'abajo': cabeza.y++; break;
      case 'izquierda': cabeza.x--; break;
      case 'derecha': cabeza.x++; break;
    }

    if (this.verificarColision(cabeza)) {
      clearInterval(this.bucleJuego);
      this.mostrarModal = true;
      return;
    }

    this.serpiente.unshift(cabeza);

    if (cabeza.x === this.comida.x && cabeza.y === this.comida.y) {
      this.puntuacion++;
      this.generarComida();
    } else {
      this.serpiente.pop();
    }

    this.dibujarJuego();
  }

  private verificarColision(cabeza: { x: number; y: number }): boolean {
    return (
      cabeza.x < 0 || cabeza.x >= this.cantidadCeldas ||
      cabeza.y < 0 || cabeza.y >= this.cantidadCeldas ||
      this.serpiente.some(segmento => segmento.x === cabeza.x && segmento.y === cabeza.y)
    );
  }

  private dibujarJuego() {
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(0, 0, this.lienzojuego.nativeElement.width, this.lienzojuego.nativeElement.height);

    this.ctx.fillStyle = 'green';
    this.serpiente.forEach(segmento => {
      this.ctx.fillRect(segmento.x * this.tamanioCelda, segmento.y * this.tamanioCelda, this.tamanioCelda - 2, this.tamanioCelda - 2);
    });

    this.ctx.fillStyle = 'red';
    this.ctx.fillRect(this.comida.x * this.tamanioCelda, this.comida.y * this.tamanioCelda, this.tamanioCelda - 2, this.tamanioCelda - 2);
  }

  reiniciarJuego() {
    this.iniciarJuego();
  }
}