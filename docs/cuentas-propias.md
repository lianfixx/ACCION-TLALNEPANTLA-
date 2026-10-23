# Cuentas propias

Este documento sustituye las instrucciones históricas de autenticación de auditorías anteriores.

## Primer acceso

La configuración privada del despliegue define `OWNER_ACCOUNT_EMAIL`, `OWNER_SETUP_HASH` y `OWNER_SETUP_EXPIRES_AT`. El hash SHA-256 corresponde a un secreto aleatorio de 256 bits; el secreto original se entrega únicamente al propietario en el fragmento de `/admin/activar#codigo=…`. El fragmento se retira del historial al abrir el formulario. Nunca se incluye en la presentación, código ni registros.

El propietario elige un usuario y una contraseña. La activación solo funciona antes de la fecha límite, cuando no existe contraseña del propietario y no consta una activación anterior. No permite reclamar una cuenta indicando su correo. Después de la activación se pueden retirar el hash y su vencimiento del entorno; conservar el correo del propietario.

## Administración de cuentas

En `/admin/cuenta`, el propietario crea nombre, correo, usuario, contraseña y permiso. Participación es el permiso inicial y no concede acceso al panel. El correo identifica los expedientes y no se cambia desde esta pantalla. El usuario admite entre 3 y 40 caracteres; la contraseña entre 15 y 128. Las contraseñas se guardan mediante scrypt con sal aleatoria. El sistema no muestra ni recupera contraseñas existentes.

Cada persona recibe sus credenciales del propietario. Puede entrar en `/ingresar` y cambiar su contraseña en `/cuenta`. Los permisos administrativos llevan al panel. El propietario puede restablecer una contraseña o revocar acceso confirmando su propia contraseña. Las sesiones tienen un máximo de ocho horas y vencen tras treinta minutos de inactividad.

La recuperación del propietario requiere una intervención privada del operador, con verificación de identidad. No hay un restablecimiento público ni un acceso alternativo mediante cabeceras externas.

## Límites de verificación

Las pruebas del Worker usan SQLite aislado y sesiones propias. No equivalen a una prueba visual de producción. La activación de la cuenta real queda a cargo del propietario, quien elige sus credenciales. No se promete inmunidad a ataques. El alojamiento y dominio no se han migrado.
