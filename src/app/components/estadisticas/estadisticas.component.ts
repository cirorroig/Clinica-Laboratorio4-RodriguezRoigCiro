import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from '@angular/fire/firestore';
import { Firestore } from '@angular/fire/firestore';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface Turno {
  id: string;
  uidPaciente: string;
  uidEspecialista: string;
  fecha: Date;
  hora: string;
  status: string;
  especialidad: string;
}

interface User {
  uid: string;
  id?: string;
  nombre: string;
  apellido: string;
  perfil: 'admin' | 'patient' | 'specialist';
  especialidad?: string;
}
@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './estadisticas.component.html',
  styleUrl: './estadisticas.component.css',
})
export class EstadisticasComponent {
  private pieChart: Chart | undefined;
  private lineChart: Chart | undefined;
  private pendingChart: Chart | undefined;
  private completedChart: Chart | undefined;

  especialistas: User[] = [];
  selectedSpecialistId: string = '';
  showLogs: boolean = false;
  logs: any[] = [];

  constructor(private firestore: Firestore) {}

  async ngOnInit() {
    await this.loadEspecialistas();
    await this.loadEspecialidades();
    await this.loadTurnosPorDia();
    await this.loadLogs();
  }

  private async loadEspecialistas() {
    const usuariosRef = collection(this.firestore, 'usuarios');
    const q = query(usuariosRef, where('perfil', '==', 'specialist'));
    const querySnapshot = await getDocs(q);
    this.especialistas = querySnapshot.docs.map((doc) => ({
      ...(doc.data() as User),
    }));
    console.log(this.especialistas);
  }

  private async loadEspecialidades() {
    const especialidadesRef = collection(this.firestore, 'especialidades');
    const docSnapshot = await getDocs(especialidadesRef);
    const especialidades = docSnapshot.docs[0].data()['nombres'];

    const turnosRef = collection(this.firestore, 'turnos');
    const turnosSnapshot = await getDocs(turnosRef);
    const turnos = turnosSnapshot.docs.map((doc) => doc.data() as Turno);

    const turnosPorEspecialidad = especialidades.reduce(
      (acc: any, esp: string) => {
        acc[esp] = turnos.filter((t) => t.especialidad === esp).length;
        return acc;
      },
      {}
    );

    this.createPieChart(turnosPorEspecialidad);
  }

  private async loadTurnosPorDia() {
    const turnosRef = collection(this.firestore, 'turnos');
    const turnosSnapshot = await getDocs(turnosRef);
    const turnos = turnosSnapshot.docs.map((doc) => ({
      ...(doc.data() as Turno),
      fecha: (doc.data() as any).fecha.toDate(),
    }));

    const turnosPorDia = turnos.reduce((acc: any, turno) => {
      const fecha = turno.fecha.toISOString().split('T')[0];
      acc[fecha] = (acc[fecha] || 0) + 1;
      return acc;
    }, {});

    this.createLineChart(turnosPorDia);
  }

  private createPieChart(data: any) {
    const ctx = document.getElementById('pieChart') as HTMLCanvasElement;
    if (this.pieChart) {
      this.pieChart.destroy();
    }

    const labels = Object.keys(data);
    const valores = Object.values(data);
    const colores = this.generateColors(labels.length);

    this.pieChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            data: valores as number[], // Asegúrate de que 'valores' es un arreglo de números
            backgroundColor: colores,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false, // Aquí se oculta la leyenda
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `${context.label}: ${context.raw} turnos`;
              },
            },
          },
        },
      },
    });
  }

  private createLineChart(data: any) {
    const ctx = document.getElementById('lineChart') as HTMLCanvasElement;
    if (this.lineChart) {
      this.lineChart.destroy();
    }

    const labels = Object.keys(data).sort();
    const valores = labels.map((label) => data[label]);

    this.lineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Cantidad de Turnos',
            data: valores,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }

  async updateSpecialistCharts() {
    if (!this.selectedSpecialistId) return;
    console.log(this.selectedSpecialistId);

    // Obtenemos la fecha actual
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Para turnos PENDIENTES: próximos 15 días
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 15);
    futureDate.setHours(23, 59, 59, 999);

    // Para turnos COMPLETADOS: últimos 15 días
    const pastDate = new Date(today);
    pastDate.setDate(today.getDate() - 15);
    pastDate.setHours(0, 0, 0, 0);

    // Obtenemos todos los turnos del especialista
    const turnosRef = collection(this.firestore, 'turnos');
    const q = query(
      turnosRef,
      where('uidEspecialista', '==', this.selectedSpecialistId)
    );

    const querySnapshot = await getDocs(q);
    const allTurnos = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      const fecha = data['fecha'].toDate();
      return {
        ...(data as Turno),
        fecha: fecha,
      };
    });

    // Filtramos los turnos PENDIENTES (próximos 15 días)
    const turnosPendientes = allTurnos.filter((turno) => {
      const turnoDate = new Date(turno.fecha);
      return (
        turno.status === 'PENDIENTE' &&
        turnoDate >= today &&
        turnoDate <= futureDate
      );
    });

    // Filtramos los turnos COMPLETADOS (últimos 15 días)
    const turnosCompletados = allTurnos.filter((turno) => {
      const turnoDate = new Date(turno.fecha);
      return (
        turno.status === 'COMPLETADO' &&
        turnoDate >= pastDate &&
        turnoDate <= today
      );
    });

    console.log('Turnos pendientes próximos:', turnosPendientes);
    console.log('Turnos completados pasados:', turnosCompletados);

    // Creamos los gráficos con los turnos filtrados
    this.createPendingChart(turnosPendientes);
    this.createCompletedChart(turnosCompletados);
  }

  private createPendingChart(turnos: Turno[]) {
    console.log('turnos', turnos);

    const ctx = document.getElementById('pendingChart') as HTMLCanvasElement;
    if (this.pendingChart) {
      this.pendingChart.destroy();
    }

    const turnosPorDia = this.groupTurnosByDate(turnos);

    this.pendingChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(turnosPorDia),
        datasets: [
          {
            label: 'Turnos Pendientes',
            data: Object.values(turnosPorDia),
            backgroundColor: 'rgba(255, 159, 64, 0.5)',
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }

  private createCompletedChart(turnos: Turno[]) {
    const ctx = document.getElementById('completedChart') as HTMLCanvasElement;
    if (this.completedChart) {
      this.completedChart.destroy();
    }

    const turnosPorDia = this.groupTurnosByDate(turnos);

    this.completedChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(turnosPorDia),
        datasets: [
          {
            label: 'Turnos Completados',
            data: Object.values(turnosPorDia),
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }

  private groupTurnosByDate(turnos: Turno[]) {
    return turnos.reduce((acc: any, turno) => {
      const fecha = turno.fecha.toISOString().split('T')[0];
      acc[fecha] = (acc[fecha] || 0) + 1;
      return acc;
    }, {});
  }

  private generateColors(count: number): string[] {
    const colors = [];
    for (let i = 0; i < count; i++) {
      const hue = (i * 360) / count;
      colors.push(`hsla(${hue}, 70%, 60%, 0.8)`);
    }
    return colors;
  }

  async loadLogs() {
    const logsRef = collection(this.firestore, 'logs');
    const querySnapshot = await getDocs(logsRef);
    this.logs = querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    }));
    console.log(this.logs);
  }

  toggleLogs() {
    this.showLogs = !this.showLogs;
  }

  exportToExcel() {
    const data = this.prepareExportData();
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estadísticas');
    XLSX.writeFile(wb, 'estadisticas.xlsx');
  }

  exportToPDF() {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Definimos los gráficos a agregar al PDF
    const charts = [
      { id: 'pieChart', title: 'Turnos por Especialidad' },
      { id: 'lineChart', title: 'Turnos por Día' },
      { id: 'pendingChart', title: 'Turnos Pendientes' },
      { id: 'completedChart', title: 'Turnos Completados' },
    ];

    let positionY = 10;
    let processedCharts = 0;

    // Función para procesar y agregar los gráficos al PDF
    const processChart = (
      chart: { id: string; title: string },
      index: number
    ) => {
      const canvas = document.getElementById(chart.id) as HTMLCanvasElement;
      if (canvas) {
        // Verificamos si necesitamos agregar una nueva página
        if (positionY > doc.internal.pageSize.getHeight() - 60) {
          doc.addPage();
          positionY = 10;
        }

        // Usamos html2canvas para convertir el gráfico en imagen
        return html2canvas(canvas, {
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: '#ffffff',
        }).then((canvasImg) => {
          const imgData = canvasImg.toDataURL('image/png');
          const imgWidth = pageWidth - 20;
          const aspectRatio = canvasImg.width / canvasImg.height;
          const imgHeight = imgWidth / aspectRatio;

          // Agregamos el título y la imagen del gráfico al PDF
          doc.text(chart.title, 10, positionY);
          doc.addImage(imgData, 'PNG', 10, positionY + 10, imgWidth, imgHeight);
          positionY += imgHeight + 20;

          processedCharts++;
          if (processedCharts === charts.length) {
            // After all charts are processed, add logs if they're being shown
            if (this.showLogs && this.logs.length > 0) {
              this.addLogsToPDF(doc);
            } else {
              doc.save('EstadisticasTurnos.pdf');
            }
          }
        });
      }
      return Promise.resolve();
    };

    // Procesamos los gráficos en orden
    charts.reduce((promise, chart, index) => {
      return promise.then(() => processChart(chart, index));
    }, Promise.resolve());
  }

  private addLogsToPDF(doc: jsPDF) {
    // Add a new page for logs
    doc.addPage();
    
    // Set initial position
    let yPos = 20;
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    
    // Add title
    doc.setFontSize(16);
    doc.text('Logs del Sistema', margin, yPos);
    yPos += 10;
    
    // Set font size for content
    doc.setFontSize(10);
    
    // Define columns
    const columns = ['Fecha', 'Usuario', 'Perfil', 'Detalles'];
    const columnWidths = [40, 40, 30, 70]; // Widths in mm
    
    // Add column headers
    yPos += 10;
    let xPos = margin;
    doc.setFont('helvetica', 'bold');
    columns.forEach((column, index) => {
      doc.text(column, xPos, yPos);
      xPos += columnWidths[index];
    });
    
    // Reset font
    doc.setFont('helvetica', 'normal');
    
    // Add log entries
    this.logs.forEach((log) => {
      yPos += 10;
      
      // Check if we need a new page
      if (yPos >= pageHeight - margin) {
        doc.addPage();
        yPos = 20;
      }
      
      // Format date
      const fecha = log.fecha.toDate();
      const fechaFormateada = fecha.toLocaleDateString() + ' ' + fecha.toLocaleTimeString();
      
      // Get user profile text
      const perfil = log.usuario.perfil === 'admin' ? 'Administrador' :
                    log.usuario.perfil === 'specialist' ? 'Especialista' : 'Paciente';
      
      // Add row data
      xPos = margin;
      const rowData = [
        fechaFormateada,
        `${log.usuario.nombre} ${log.usuario.apellido}`,
        perfil,
        log.detalles
      ];
      
      rowData.forEach((text, index) => {
        // Handle long text wrapping
        const textLines = doc.splitTextToSize(text, columnWidths[index] - 2);
        doc.text(textLines, xPos, yPos);
        xPos += columnWidths[index];
        
        // Adjust yPos for the next row based on number of lines
        if (index === rowData.length - 1) {
          const lineHeight = 7;
          yPos += (textLines.length - 1) * lineHeight;
        }
      });
    });
    
    // Save the PDF
    doc.save('EstadisticasTurnos.pdf');
  }

  // Add a specific method for exporting only logs to PDF
  exportLogsToPDF() {
    const doc = new jsPDF('p', 'mm', 'a4');
    this.addLogsToPDF(doc);
  }
  private prepareExportData() {
    const data: any[] = [];

    // Datos del gráfico de turnos por especialidad
    if (this.pieChart) {
      const labels = this.pieChart.data.labels as string[];
      const values = this.pieChart.data.datasets[0].data as number[];
      labels.forEach((label, index) => {
        data.push({
          categoria: 'Turnos por Especialidad',
          especialidad: label,
          cantidad: values[index],
        });
      });
    }

    // Datos del gráfico de turnos por día
    if (this.lineChart) {
      const dates = this.lineChart.data.labels as string[];
      const counts = this.lineChart.data.datasets[0].data as number[];
      dates.forEach((date, index) => {
        data.push({
          categoria: 'Turnos por Día',
          fecha: date,
          cantidad: counts[index],
        });
      });
    }

    // Datos del gráfico de turnos pendientes por especialista
    if (this.pendingChart) {
      const dates = this.pendingChart.data.labels as string[];
      const counts = this.pendingChart.data.datasets[0].data as number[];
      dates.forEach((date, index) => {
        data.push({
          categoria: 'Turnos Pendientes',
          fecha: date,
          cantidad: counts[index],
        });
      });
    }

    // Datos del gráfico de turnos completados por especialista
    if (this.completedChart) {
      const dates = this.completedChart.data.labels as string[];
      const counts = this.completedChart.data.datasets[0].data as number[];
      dates.forEach((date, index) => {
        data.push({
          categoria: 'Turnos Completados',
          fecha: date,
          cantidad: counts[index],
        });
      });
    }

    return data;
  }
}
