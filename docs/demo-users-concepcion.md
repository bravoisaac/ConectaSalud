# Datos demo Salut App - Concepcion

Datos inventados para pruebas locales. No corresponden a personas reales.

Password para todas las cuentas:

```text
SalutDemo2026!
```

## Admin

| Rol | Nombre | Correo | Password | Uso |
| --- | --- | --- | --- | --- |
| admin | Admin Salut Demo | admin@salutdemo.cl | SalutDemo2026! | Administrar verificaciones, reportes, empleos y flujo general |

## Usuarios salud

| Rol | Nombre | Correo | Password | Telefono | Comuna | Perfil |
| --- | --- | --- | --- | --- | --- | --- |
| health | Camila Riquelme | salud01@salutdemo.cl | SalutDemo2026! | +56941001001 | Concepcion | TENS cuidados domiciliarios |
| health | Matias Figueroa | salud02@salutdemo.cl | SalutDemo2026! | +56941001002 | San Pedro de la Paz | Kinesiologo musculoesqueletico |
| health | Valentina Soto | salud03@salutdemo.cl | SalutDemo2026! | +56941001003 | Talcahuano | Enfermera universitaria |
| health | Javiera Munoz | salud04@salutdemo.cl | SalutDemo2026! | +56941001004 | Chiguayante | Fonoaudiologa adulto mayor |
| health | Diego Paredes | salud05@salutdemo.cl | SalutDemo2026! | +56941001005 | Hualpen | Terapeuta ocupacional |
| health | Fernanda Aravena | salud06@salutdemo.cl | SalutDemo2026! | +56941001006 | Coronel | Nutricionista clinica |
| health | Ignacio Salazar | salud07@salutdemo.cl | SalutDemo2026! | +56941001007 | Tome | Psicologo clinico |
| health | Catalina Vera | salud08@salutdemo.cl | SalutDemo2026! | +56941001008 | Penco | Medico general |
| health | Andres Leiva | salud09@salutdemo.cl | SalutDemo2026! | +56941001009 | Lota | TENS adulto mayor |
| health | Paula Contreras | salud10@salutdemo.cl | SalutDemo2026! | +56941001010 | Hualqui | Kinesiologa respiratoria |

Notas:

- `salud01` a `salud08` quedan aprobados.
- `salud09` y `salud10` quedan pendientes de verificacion para probar el panel admin.

## Usuarios normales

| Rol | Nombre | Correo | Password | Telefono | Comuna | Profesion |
| --- | --- | --- | --- | --- | --- | --- |
| user | Daniela Morales | usuario01@salutdemo.cl | SalutDemo2026! | +56941002001 | Concepcion | TENS |
| user | Felipe Cares | usuario02@salutdemo.cl | SalutDemo2026! | +56941002002 | San Pedro de la Paz | Kinesiologo |
| user | Sofia Henriquez | usuario03@salutdemo.cl | SalutDemo2026! | +56941002003 | Talcahuano | Enfermera |
| user | Martin Rojas | usuario04@salutdemo.cl | SalutDemo2026! | +56941002004 | Hualpen | Auxiliar de enfermeria |
| user | Antonia Lagos | usuario05@salutdemo.cl | SalutDemo2026! | +56941002005 | Chiguayante | Cuidadora adulto mayor |
| user | Sebastian Pino | usuario06@salutdemo.cl | SalutDemo2026! | +56941002006 | Coronel | Paramedico |
| user | Francisca Vidal | usuario07@salutdemo.cl | SalutDemo2026! | +56941002007 | Penco | Fonoaudiologa |
| user | Nicolas Carrasco | usuario08@salutdemo.cl | SalutDemo2026! | +56941002008 | Lota | TENS urgencia |
| user | Constanza Reyes | usuario09@salutdemo.cl | SalutDemo2026! | +56941002009 | Tome | Nutricionista |
| user | Benjamin Saavedra | usuario10@salutdemo.cl | SalutDemo2026! | +56941002010 | Hualqui | Kinesiologo respiratorio |

## Datos incluidos

- 10 usuarios salud con perfil profesional, disponibilidad y ubicacion en Gran Concepcion.
- 10 usuarios normales con perfil laboral y postulaciones.
- 1 admin.
- 5 empresas demo aprobadas.
- 12 empleos del area salud: TENS, kinesiologia, enfermeria, fonoaudiologia, nutricion, psicologia, paramedico y cuidados.
- Postulaciones con estados `applied`, `offered`, `accepted`, `declined` y `rejected`.
- Reservas de salud con estados `requested`, `accepted`, `in_service`, `completed` y `cancelled`.
- Chats para reservas confirmadas.
- Reportes para revisar desde admin.
- Solicitudes de verificacion para probar aprobacion/rechazo.
- Pagos demo asociados a reservas.

## Comando para recargar datos

Ejecutar desde `Backend/api`:

```bash
php artisan db:seed --class=ConcepcionDemoSeeder
```

Este comando borra los datos actuales de las tablas de la app y vuelve a poblar la base demo.
