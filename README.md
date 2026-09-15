# VoidCore Studios — página de eventos

## Qué es esto
Página para gestionar eventos de Minecraft de VoidCore Studios: login, lista de
eventos, apuntarse, whitelist y panel de administración.

## Antes de nada: pega tus reglas en Firestore
1. Ve a la consola de Firebase → Firestore Database → pestaña "Reglas".
2. Borra lo que hay y pega TODO el contenido del archivo `firestore.rules`.
3. Dale a "Publicar".

## Súbelo a GitHub (sin usar la terminal)
1. Entra a github.com → botón verde "New" → crea un repositorio llamado `voidcore-web`
   (puede ser privado).
2. Dentro del repo vacío, dale a "uploading an existing file".
3. Arrastra TODOS los archivos y carpetas de esta carpeta (menos `node_modules`
   si llegaras a tenerla) y confirma el commit.

## Publícalo con Vercel
1. Entra a vercel.com → "Add New" → "Project".
2. Elige el repositorio `voidcore-web` que acabas de subir.
3. Dale a "Deploy". En un par de minutos te da un link tipo `voidcore-web.vercel.app`.

## Hazte admin a ti mismo
1. Entra a tu página ya publicada y regístrate normal con tu correo.
2. Ve a Firebase Console → Firestore Database → colección `users`.
3. Busca el documento con tu correo, ábrelo, y cambia el campo `role` de
   `"user"` a `"admin"`.
4. Recarga tu página — ya vas a ver el botón "Panel" en la barra de arriba.

## Cómo funciona por dentro (para cuando quieras añadir algo)
- `lib/firebase.js` — conexión con tu proyecto de Firebase.
- `lib/AuthContext.js` — sabe quién entró y si es admin o no.
- `app/admin/page.js` — crear eventos, abrir/cerrar whitelist, copiar la lista.
- `app/events/[id]/page.js` — donde los usuarios se apuntan y ponen su nick.
- `firestore.rules` — el candado real: aunque alguien intente hacer trampa
  desde el navegador, esto lo bloquea del lado del servidor.
