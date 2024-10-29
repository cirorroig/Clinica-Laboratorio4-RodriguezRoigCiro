import { Component, inject, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore, collection, addDoc, collectionData, query, orderBy, Timestamp } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Observable } from 'rxjs';

interface MensajeChat {
  mensaje: string;
  usuario: string;
  fecha: Timestamp;
}

@Component({
  selector: 'app-chat-flotante',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-flotante.component.html',
  styleUrls: ['./chat-flotante.component.css']
})
export class ChatFlotanteComponent implements AfterViewChecked {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  
  nuevoMensaje: string = '';
  emailUsuario: string | null = null;
  mensajes$: Observable<MensajeChat[]>;
  chatAbierto = false;

  @ViewChild('mensajesContainer', { static: false }) mensajesContainer!: ElementRef;

  constructor() {
    const coleccionChat = collection(this.firestore, 'chat');
    const q = query(coleccionChat, orderBy('fecha', 'asc'));
    this.mensajes$ = collectionData(q, { idField: 'id' }) as Observable<MensajeChat[]>;

    this.auth.onAuthStateChanged((usuario) => {
      this.emailUsuario = usuario?.email ?? 'Anónimo';
    });
  }

  async enviarMensaje() {
    if (this.nuevoMensaje.trim() === '' || !this.emailUsuario) {
      return;
    }

    const coleccionChat = collection(this.firestore, 'chat');
    await addDoc(coleccionChat, {
      mensaje: this.nuevoMensaje,
      usuario: this.emailUsuario,
      fecha: Timestamp.now(),
    });

    this.nuevoMensaje = '';
  }

  alternarChat() {
    this.chatAbierto = !this.chatAbierto;
  }

  ngAfterViewChecked() {
    this.scrollToBottom(); 
  }

  private scrollToBottom(): void {
    if (this.mensajesContainer) {
      const container = this.mensajesContainer.nativeElement;
      container.scrollTop = container.scrollHeight; 
    }
  }

  manejarTecla(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.enviarMensaje();
    }
  }
}
