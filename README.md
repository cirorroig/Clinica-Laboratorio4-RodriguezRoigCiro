# Sistema de Gestión de Clínica

## Descripción

Esta aplicación permite la gestión de turnos médicos, usuarios y la administración de historia clínica para una clínica. Se han desarrollado diferentes tipos de acceso y funcionalidades específicas según el rol del usuario (Paciente, Especialista, Administrador), con el objetivo de facilitar la gestión de citas, control de pacientes, y acceso a estadísticas.

### Tecnologías Utilizadas

- **Angular**: Framework de frontend.
- **Firebase**: Base de datos y autenticación.
- **Bootstrap**: Estilos y componentes.
- **Google reCAPTCHA**: Validación de usuario humano en el registro.

---

## Pantallas de la Aplicación

### Página de Bienvenida

Esta pantalla inicial ofrece acceso al sistema a través de los botones de "Login" y "Registro".

![Página de Bienvenida](/public//bienvenida.jpg?height=300&width=500)

### Registro de Usuarios

Permite el registro de nuevos usuarios en la plataforma. Los usuarios pueden ser de tres tipos:

Elección de persona a registrar 
![Registro de Paciente](/public/seleccion.jpg?height=300&width=500)

1. **Paciente**
   - Información requerida: Nombre, Apellido, Edad, DNI, Obra Social, Correo Electrónico, Contraseña y dos imágenes de perfil.
![Registro de Paciente](/public/registro-paciente.jpg?height=300&width=500)
   
1. **Especialista**
   - Información requerida: Nombre, Apellido, Edad, DNI, Especialidad (con opción de agregar nuevas especialidades), Correo Electrónico, Contraseña e imagen de perfil.
   - El ingreso al sistema requiere la aprobación por un Administrador y verificación de correo electrónico.

![Registro de Especialista](/public/registro-especialista.jpg?height=300&width=500)

1. **Administrador** (Solo accesible para creación desde la sección de "Usuarios" por un usuario con perfil de Administrador).
   - Información requerida: Nombre, Apellido, Edad, DNI, Correo Electrónico, Contraseña e imagen de perfil.

![Registro de Administrador](/public/registro-admin.jpg?height=300&width=500)

### Login

Pantalla para iniciar sesión en el sistema. Los accesos son restringidos según el rol:
- Los **Especialistas** solo pueden acceder si un Administrador ha aprobado su cuenta y han verificado su correo.
- Los **Pacientes** solo pueden acceder después de verificar su correo electrónico.

![Página de Login](/public/login.jpg?height=300&width=500)

---

## Secciones de la Aplicación

### 1. Usuarios

Accesible únicamente para el **Administrador**. Desde aquí, el Administrador puede:
- Ver la información de todos los usuarios.
- Aprobar o denegar el acceso a Especialistas.
- Crear nuevos usuarios, incluyendo Administradores.

![Sección de Usuarios](/public/usuarios.jpg?height=300&width=500)

### 2. Solicitar Turno

Accesible para **Pacientes** y **Administrador**. Permite solicitar una cita médica especificando:
- Especialidad
- Especialista
- Fecha y hora dentro de los próximos 15 días, basándose en la disponibilidad del especialista.

El **Administrador** también debe seleccionar al paciente para la cita.

![Solicitar Turno](/public/solicitar-turno.jpg?height=300&width=500)

### 3. Mis Turnos

#### Acceso como Paciente
- Visualización de los turnos solicitados por el paciente, con filtro de búsqueda por Especialidad y Especialista.
- Opciones de acción:
  - **Cancelar turno**: Permite cancelar el turno dejando un comentario (si el turno aún no ha sido realizado).
  - **Ver reseña**: Solo visible si el turno tiene una reseña.
  - **Completar encuesta y calificar atención**: Visible solo después de que el turno ha sido marcado como realizado.

![Mis Turnos - Paciente](/public/mis-turnos-paciente.jpg?height=300&width=500)

#### Acceso como Especialista
- Visualización de los turnos asignados al especialista, con filtro de búsqueda por Especialidad y Paciente.
- Opciones de acción:
  - **Cancelar o rechazar turno**: Requiere dejar un comentario.
  - **Aceptar turno**
  - **Finalizar turno**: Requiere ingresar un diagnóstico y reseña de la consulta.
  - **Ver reseña**: Solo visible si el turno tiene una reseña.

![Mis Turnos - Especialista](/public/mis-turnos-especialista.jpg?height=300&width=500)
### 3.5 Turnos
#### Acceso como Administrador
- Visualización de todos los turnos en la clínica.
- Filtro de búsqueda por Especialidad y Especialista.
- Permite cancelar turnos (si no han sido aceptados o realizados) dejando un comentario.

![Turnos - Administrador](/public/turnos.jpg?height=300&width=500)

### 4. Mi Perfil

Disponible para todos los usuarios, permite ver sus datos de perfil como nombre, apellido, y fotos.
- **Pacientes**  pueden acceder a su historia clínica desde su perfil.
- **Especialistas** tienen la opción de configurar su disponibilidad horaria, especificando los días y horarios en que están disponibles para recibir pacientes.

Perfil de pacientes
![Mi Perfil](/public/perfil-paciente.jpg?height=300&width=500)

Perfil de especialistas
![Mi Perfil](/public/perfil-especialista.jpg?height=300&width=500)
### 5. Historia Clínica

- **Administradores** pueden ver la historia clínica desde la sección de "Usuarios".
- **Especialistas** pueden acceder a la historia clínica de los pacientes que han atendido al menos una vez.

La historia clínica incluye:
- **Datos Fijos**: Altura, peso, temperatura, presión.
- **Datos Dinámicos**: Hasta tres entradas personalizables por el Especialista (clave-valor).
Vista del historial para los administradores desde Usuarios
![Historia Clínica](/public/historial-paciente.jpg?height=300&width=500)

Seccion pacientes para los especialsitas
![Historia Clínica](/public/pacientes.jpg?height=300&width=500)

### 6. Estadísticas y Reportes (Sprint 4)

Accesible solo para **Administradores**, incluye gráficos y estadísticas de la clínica:
- Log de ingresos al sistema.
- Cantidad de turnos por especialidad y por día.
- Cantidad de turnos solicitados y finalizados por médico en un intervalo de tiempo.
  
Las estadísticas se pueden exportar en formato Excel o PDF.

![Estadísticas y Reportes](/public/estadisticas.jpg?height=300&width=500)

---

## Requerimientos Adicionales

- **Captcha**: Se utiliza Google reCAPTCHA en el registro para mayor seguridad.
- **Transiciones**: Animaciones de fadein y fadeout en la solicitud de turnos
- **Filtros avanzados**: Los filtros en la sección de turnos permiten búsqueda por todos los campos, incluyendo datos de historia clínica.
- **Exportación de Datos**:
  - **Administrador**: Puede exportar un Excel con la lista de usuarios.
  - **Paciente**: Puede descargar un PDF de su historia clínica con el logo de la clínica, título y fecha de emisión.
- **Animaciones**: animaciones para distintas secciones en el login, registro y solicitud de turnos
---

## Instalación

1. Clona el repositorio:
   ```bash
   git clone https://github.com/cirorroig/Clinica-Laboratorio4-RodriguezRoigCiro
   