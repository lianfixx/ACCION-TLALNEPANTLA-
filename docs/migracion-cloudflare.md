# Plan de migración a la cuenta propia de Cloudflare

Estado: **plan; ejecutados la prueba sin cambios del paso 4 y un inventario de solo lectura** (12-nov-2026). Decisión de Emi del mismo día: publicar desde una cuenta propia de Cloudflare en lugar de Sites. Nada de lo siguiente se ha hecho. Cada paso marcado con «Emi aprueba» requiere su «sí» explícito, porque crea recursos, puede costar dinero, cambia DNS o mueve datos personales.

## Lo que hoy corre en Sites

| Pieza | En el código | Nota |
|---|---|---|
| Worker | `worker/index.ts`, compilado por Vinext y `@cloudflare/vite-plugin` | Compatibilidad `nodejs_compat` |
| Base de datos D1 | binding `DB` | Migraciones `drizzle/0000` a `0015` |
| Archivos privados R2 | binding `BUCKET` | Expedientes, cartas, imágenes privadas |
| Imágenes | binding `IMAGES` | Optimización; el sitio tiene alternativa sin él |
| Tarea diaria | cron `17 10 * * *` (04:17 en Ciudad de México) | Purga por conservación; su ejecución real no está acreditada |
| Dominio | `acciontlalnepantla.site` | Administrado hoy por Sites |

El archivo `.openai/hosting.json`, que vincula Sites con D1 y R2, no está en el repositorio. Para compilar en local se usa una copia que solo declara los nombres `DB` y `BUCKET` y que no se versiona.

Variables y secretos que lee el Worker (`lib/runtime-env.ts`). Solo se anotan los nombres; los valores nunca van al repositorio ni al chat:

- **Secretos:** `RATE_LIMIT_SECRET`, `TURNSTILE_SECRET_KEY`, `REGISTRATION_TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `OWNER_SETUP_HASH`.
- **Configuración:** `ADMIN_EMAILS`, `OWNER_ACCOUNT_EMAIL`, `OWNER_SETUP_EXPIRES_AT`, `TURNSTILE_SITE_KEY`, `TURNSTILE_EXPECTED_ACTION`, `TURNSTILE_EXPECTED_HOSTNAME`, `REGISTRATION_TURNSTILE_SITE_KEY`, `REGISTRATION_TURNSTILE_HOSTNAME`, `REGISTRATION_EMAIL_FROM`, `REGISTRATION_PUBLIC_ORIGIN`.
- **Ajustes:** los demás (`MEMBERSHIP_*`, `ENLACES_*`, datos del aviso, redes) se guardan en D1 desde Configuración. Las variables solo sirven de valor inicial.

## Inventario del 12-nov-2026

- Acceso: `cf` autenticado con un token de API de Emi guardado como secreto del entorno de la sesión (no en el repositorio). El token no tiene fecha de vencimiento; conviene ponerle una.
- La cuenta de Emi tiene Workers y bases D1 de otros proyectos. No se tocan ni se comparten con APJ.
- El dominio `acciontlalnepantla.site` no está en la cuenta de Cloudflare. **Lo registró Emi en su propia cuenta de Alibaba Cloud** (registro del 19-oct-2026, vence el 19-oct-2027), y su DNS también vive ahí, con los registros que lo conectan con Sites (`A` hacia la red de Cloudflare, verificación de OpenAI y nombre personalizado). Para el paso 7 basta con cambiar esos registros o delegar el DNS a Cloudflare; no depende de Sites. Renovar el dominio antes de octubre de 2027.
- R2 quedó activado por Emi el 12-nov-2026 (plan con uso gratuito mensual).
- Inventario de Sites: la cuenta de ChatGPT con «Continuar con Apple» es gratuita y no muestra Sites. Hay otra cuenta de OpenAI con el Gmail de Emi; por confirmar cuál publica el sitio.

## Decisión del 12-nov-2026: empezar limpio

Sites vive en una cuenta de ChatGPT sin suscripción, así que no se puede exportar su base ni su configuración. Emi confirmó que nadie se registró después del 9-oct-2026 y decidió publicar el código de GitHub en su Cloudflare con D1 y R2 nuevos. Las dos publicaciones de Actualidad y los ajustes del aviso se vuelven a cargar desde el panel. El sitio de Sites sigue en línea hasta el cambio de DNS. Los pasos 1 y 2 quedan sin efecto.

Cómo se compila para la cuenta propia: `APJ_D1_DATABASE_NAME`, `APJ_D1_DATABASE_ID` y `APJ_R2_BUCKET` en el entorno de `npm run build`; después `wrangler deploy --config dist/server/wrangler.json`. Las migraciones se aplican desde `drizzle/` con `wrangler d1 migrations apply`. Prueba sin cambios del 12-nov: 570 KB comprimidos, con D1, R2 e Imágenes reconocidos.

## Pasos

1. **Inventario de Sites.** Desde Sites o con ChatGPT, exportar el `.openai/hosting.json` real, la lista de variables (sin valores) y la versión publicada. Confirmar si la v45 sigue siendo la vigente.
2. **Respaldo de datos (Emi aprueba).** Exportar D1 y los objetos de R2 de producción a un lugar privado, nunca a GitHub. Probar la restauración en una instancia aislada; existe `scripts/audit-storage-local.mjs` como referencia local.
3. **Cuenta y plan.** Emi inicia sesión con `cf auth login` en su navegador. Revisar si D1, R2, Images y Cron caben en el plan gratuito o requieren pago. **Emi aprueba** cualquier plan de pago o la activación de R2.
4. **Configuración de despliegue.** Resultado del 12-nov-2026 (`cf` 1.0.0-beta.31, sin sesión): `cf migrate --dry-run` en el repositorio responde «No Wrangler config found», porque la configuración vive en `vite.config.ts`. En una copia desechable con un `wrangler.jsonc` equivalente (nombres de prueba, ID de D1 de relleno), `cf migrate` propone un solo archivo, `cloudflare.config.ts`, con el Worker `./worker/index.ts`, `nodejs_compat`, el cron `17 10 * * *` y los bindings `DB` (D1), `BUCKET` (R2) e `IMAGES`. Pide instalar `cf@latest` y `@cloudflare/vite-plugin@beta` en el proyecto. Ese cambio de dependencias y el retiro de la configuración de Sites en `vite.config.ts` y `build/sites-vite-plugin.ts` se hacen en una rama aparte, con las pruebas del repositorio.
   Texto original del paso: **Configuración de despliegue.** El proyecto configura Wrangler dentro de `vite.config.ts` (plugin de Cloudflare), no en un `wrangler.jsonc`. Antes de usar `cf dev`, `cf build` o `cf deploy`, correr `cf migrate --dry-run` y revisar qué propone. Si conviene un `wrangler.jsonc`, se crea con los IDs reales de D1 y R2 de la cuenta nueva.
5. **Recursos (Emi aprueba).** Crear la D1 y el bucket R2 con `--dry-run` primero, aplicar las migraciones de `drizzle/`, importar el respaldo del paso 2 y cargar los secretos con `cf deploy --secrets-file` o `cf workers secrets update`, nunca en la línea de comandos.
6. **Publicación de prueba (Emi aprueba).** Desplegar en el subdominio `workers.dev`, sin tocar el dominio. Probar con cuentas reales autorizadas: portada, registro, confirmación de correo, solicitud, carga de documentos, panel y descarga privada. Comprobar el cron en el registro de ejecuciones.
7. **Dominio (Emi aprueba).** Mover `acciontlalnepantla.site` a la cuenta propia o apuntar su DNS al Worker. Ese cambio hace que el sitio deje de servirse desde Sites. Después, comprobar HTTPS, rutas críticas y el formulario real en móvil y escritorio.
8. **Cierre.** Dejar Sites sin tráfico pero intacto hasta confirmar una semana sin incidencias. Registrar todo en `CHANGELOG.md`.

## Riesgos

- Datos personales (INE, comprobantes, cartas) viajan en el paso 2: canal privado, cifrado y borrado de copias temporales.
- Si las sesiones dependen de secretos distintos, las personas deberán volver a iniciar sesión.
- Mientras el DNS se propaga, Sites y la cuenta nueva pueden recibir escrituras a la vez. Conviene cerrar temporalmente el registro y la carga de documentos durante el cambio.
