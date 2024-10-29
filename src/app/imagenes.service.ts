import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ImagenesService {
  // URL de la API de Pexels
  private pexelsApiUrl = 'https://api.pexels.com/v1/search';
  private pexelsApiKey = 'LzwSNvL48ANRxurFrlQGkYdPPuUBPCtYPTx5raSm88C1Qx7UxlvBJ9uC'; // Aquí agrega tu clave de API de Pexels

  constructor(private http: HttpClient) {}

  getImages(query: string, count: number = 1): Observable<any> {
    // Crear los headers con la clave de API de Pexels
    const headers = new HttpHeaders({
      Authorization: this.pexelsApiKey,
    });

    // Construir la URL de solicitud con el término de búsqueda y el número de resultados
    const url = `${this.pexelsApiUrl}?query=${encodeURIComponent(query)}&per_page=${count}`;

    // Imprimir la URL para depuración
    console.log('Fetching images from URL:', url);

    // Hacer la solicitud HTTP GET
    return this.http.get<any>(url, { headers });
  }
}
