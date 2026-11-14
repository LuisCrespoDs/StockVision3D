# StockVision 3D

Sistema web full stack para la gestión de inventario tecnológico.
Integra un catálogo de productos, ubicaciones físicas, movimientos de
entrada y salida, reportes operativos y un explorador tridimensional del
almacén.

> **Estado del proyecto:** el código fuente y la configuración de
> despliegue están preparados en este repositorio. La publicación en
> Render y Vercel debe realizarse y validarse en las cuentas
> correspondientes. No se incluyen credenciales ni conexiones privadas.

## Tabla de contenido

-   [Características](#características)
-   [Arquitectura](#arquitectura)
-   [Tecnologías](#tecnologías)
-   [Estructura del proyecto](#estructura-del-proyecto)
-   [Requisitos previos](#requisitos-previos)
-   [Configuración de Supabase](#configuración-de-supabase)
-   [Configuración y ejecución del
    backend](#configuración-y-ejecución-del-backend)
-   [Configuración y ejecución del
    frontend](#configuración-y-ejecución-del-frontend)
-   [Roles y permisos](#roles-y-permisos)
-   [API REST](#api-rest)
-   [Modelo de datos e inventario](#modelo-de-datos-e-inventario)
-   [Despliegue](#despliegue)
-   [Seguridad](#seguridad)
-   [Validación y pruebas
    recomendadas](#validación-y-pruebas-recomendadas)
-   [Alcance y limitaciones](#alcance-y-limitaciones)

## Características

### Panel general

-   Indicadores de productos activos, unidades disponibles y valor
    referencial del inventario.
-   Alertas de productos en o por debajo del stock mínimo.
-   Resumen de ubicaciones activas y ocupadas.
-   Gráfico mensual de entradas y salidas.
-   Actividad reciente del almacén.

### Productos

-   Consulta y búsqueda por SKU, nombre o categoría.
-   Registro y edición de productos.
-   Precio de referencia, descripción y stock mínimo.
-   Desactivación lógica de productos.

### Ubicaciones

-   Administración de pasillos, estanterías, niveles y columnas.
-   Capacidad máxima en unidades y clasificación por zona.
-   Consulta de existencias por ubicación.
-   Validación para evitar desactivar ubicaciones que todavía tengan
    stock.

### Movimientos

-   Registro de entradas y salidas.
-   Historial de movimientos y usuario que registró la operación.
-   Validación de stock disponible y capacidad de la ubicación.
-   Actualización del inventario mediante triggers de PostgreSQL.

### Almacén 3D

-   Escena tridimensional construida con Three.js mediante React Three
    Fiber.
-   Distribución inicial representada por 4 estanterías, 3 niveles y 4
    columnas por nivel (48 ubicaciones).
-   Rotación con el ratón y acercamiento con la rueda.
-   Selección de compartimientos para consultar ubicación, capacidad y
    productos almacenados.
-   Indicadores visuales de ubicaciones ocupadas, con stock bajo y
    libres.

La escena representa la distribución lógica registrada en la base de
datos; no es un levantamiento arquitectónico ni un gemelo digital
conectado a sensores.

### Reportes y usuarios

-   Stock por categoría.
-   Productos con stock bajo y exportación de ese listado a CSV.
-   Movimientos mensuales.
-   Administración de usuarios y asignación de roles, disponible para
    administradores.

## Arquitectura

``` mermaid
flowchart TD
    A[Usuario en navegador] --> B[Frontend React + Vite]
    B --> C[Supabase Auth]
    B --> D[API REST FastAPI]
    D --> C
    D --> E[(PostgreSQL en Supabase)]
    E --> F[Triggers de inventario]
    B --> G[Escena 3D Three.js]
```

-   **Frontend:** aplicación React que consume la API y utiliza Supabase
    Auth para iniciar y mantener sesiones.
-   **Backend:** API FastAPI que verifica el token de Supabase, aplica
    permisos y consulta PostgreSQL mediante Psycopg.
-   **Base de datos:** PostgreSQL administrado por Supabase. Los
    triggers validan y actualizan existencias al registrar movimientos.
-   **Despliegue previsto:** Vercel para el frontend y Render para el
    backend.

## Tecnologías

  Capa                  Tecnologías
  --------------------- ---------------------------------------
  Frontend              React 18, Vite 5, React Router, Axios
  Visualización 3D      Three.js, React Three Fiber, Drei
  Gráficos              Recharts
  Estilos               Tailwind CSS 3 y CSS
  Backend               Python, FastAPI, Uvicorn, Pydantic
  Acceso a PostgreSQL   Psycopg 3 y psycopg-pool
  Autenticación         Supabase Auth
  Base de datos         PostgreSQL en Supabase
  Hosting previsto      Vercel y Render

Las versiones exactas de las dependencias están fijadas en
`frontend/package.json`, `frontend/package-lock.json` y
`backend/requirements.txt`.

## Estructura del proyecto

``` text
StockVision3D/
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   ├── auth.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── main.py
│   │   └── schemas.py
│   ├── .env.example
│   ├── .python-version
│   └── requirements.txt
├── database/
│   ├── 01_schema_and_seed.sql
│   └── 02_promote_first_admin.sql
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   ├── AuthContext.jsx
│   │   ├── api.js
│   │   └── supabase.js
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   ├── vercel.json
│   └── vite.config.js
├── .gitignore
├── README.md
└── render.yaml
```

## Requisitos previos

-   Python 3.11, versión indicada en `backend/.python-version`.
-   Node.js y npm.
-   Una cuenta y un proyecto de Supabase.
-   Git para clonar y versionar el repositorio.
-   PowerShell en Windows o una terminal equivalente.

## Configuración de Supabase

### Importante: migración sobre el esquema existente

`database/01_schema_and_seed.sql` es una **migración para el proyecto
Supabase existente**, no un script de creación desde cero. Comienza
modificando las tablas `public.productos`, `public.ubicaciones` y
`public.movimientos`; por tanto, esas tablas y las columnas base que
utiliza deben existir previamente.

Si se utiliza un proyecto Supabase vacío, este script no basta para
inicializarlo: primero se debe crear el esquema base compatible con esas
tres tablas. No ejecutes la migración en una base de datos distinta sin
revisar antes su estructura y contar con un respaldo.

### Ejecutar la migración

1.  Abre el proyecto Supabase y entra en **SQL Editor**.
2.  Revisa que existan las tablas base `public.productos`,
    `public.ubicaciones` y `public.movimientos` con las columnas que
    referencia el script.
3.  Ejecuta `database/01_schema_and_seed.sql`.
4.  Comprueba los resultados con las consultas de verificación incluidas
    al final del script.

La migración: - Añade columnas de descripción, stock mínimo, capacidad,
zona, estado y marcas de tiempo. - Crea las tablas `public.inventario` y
`public.perfiles`. - Crea funciones y triggers para registrar perfiles y
mantener existencias. - Activa Row Level Security (RLS) en las tablas
indicadas. - Inserta datos sintéticos de demostración: 12 productos, 48
ubicaciones y movimientos iniciales, evitando duplicar la carga inicial
identificada por la observación de demostración.

El script utiliza `BEGIN` y `COMMIT` y declara que conserva las tablas
originales; aun así, realiza primero un respaldo de la base de datos.

### Crear el primer administrador

1.  Inicia la aplicación y regístrate mediante Supabase Auth.
2.  Si está habilitada la confirmación de correo, confirma la cuenta
    desde el mensaje recibido.
3.  Abre `database/02_promote_first_admin.sql`.
4.  Sustituye **las dos apariciones** de
    `TU_CORREO_DE_REGISTRO@ejemplo.com` por el correo exacto con el que
    registraste la cuenta.
5.  Ejecuta el script en SQL Editor.
6.  Comprueba que la consulta final muestre el perfil con rol `admin`.
7.  Cierra sesión y vuelve a iniciar sesión para cargar el rol
    actualizado.

Las cuentas nuevas se crean inicialmente con rol `consulta`. El script
de administrador actualiza el rol de un usuario ya registrado; no crea
la cuenta.

## Configuración y ejecución del backend

### Variables de entorno

Copia `backend/.env.example` como `backend/.env` y completa:

  -----------------------------------------------------------------------
  Variable                            Descripción
  ----------------------------------- -----------------------------------
  `DATABASE_URL`                      Cadena de conexión PostgreSQL de
                                      Supabase.

  `SUPABASE_URL`                      URL del proyecto Supabase.

  `SUPABASE_ANON_KEY`                 Clave pública anon/publishable
                                      utilizada para verificar sesiones.

  `CORS_ORIGINS`                      Orígenes autorizados para acceder a
                                      la API, separados por comas.

  `APP_ENV`                           Entorno de ejecución, por ejemplo
                                      `development` o `production`.
  -----------------------------------------------------------------------

Obtén la cadena PostgreSQL desde la opción **Connect** de Supabase. Si
la red o el hosting no admite la conexión directa, revisa las opciones
de pooler de Supabase y utiliza la cadena compatible con el entorno de
despliegue. La contraseña puede requerir codificación URL si contiene
caracteres reservados.

### Windows PowerShell

Desde la carpeta raíz del repositorio:

``` powershell
Copy-Item backend/.env.example backend/.env

cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Si PowerShell bloquea la activación del entorno virtual, puedes
permitirla solo para la sesión actual:

``` powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

También puedes ejecutar Python directamente desde
`.venv\Scripts\python.exe` sin activar el entorno.

### Verificar el backend

Con el servidor iniciado:

-   API raíz: `http://localhost:8000/`
-   Salud: `http://localhost:8000/health`
-   Documentación interactiva: `http://localhost:8000/docs`

La API utiliza el prefijo `/api` para sus rutas funcionales.

## Configuración y ejecución del frontend

Copia `frontend/.env.example` como `frontend/.env` y completa:

  -----------------------------------------------------------------------
  Variable                            Descripción
  ----------------------------------- -----------------------------------
  `VITE_SUPABASE_URL`                 URL del proyecto Supabase.

  `VITE_SUPABASE_ANON_KEY`            Clave pública anon/publishable de
                                      Supabase.

  `VITE_API_URL`                      URL base de la API, incluyendo
                                      `/api`. En local:
                                      `http://localhost:8000/api`.
  -----------------------------------------------------------------------

En una segunda terminal, desde la carpeta raíz:

``` powershell
Copy-Item frontend/.env.example frontend/.env

cd frontend
npm ci
npm run dev
```

Abre `http://localhost:5173`.

Para generar y revisar la compilación de producción:

``` powershell
npm run build
npm run preview
```

Vite genera los archivos de producción en `frontend/dist`.

## Roles y permisos

  Funcionalidad                               `admin`   `encargado`   `consulta`
  ------------------------------------------ --------- ------------- ------------
  Consultar panel, productos y ubicaciones      Sí          Sí            Sí
  Consultar almacén 3D y reportes               Sí          Sí            Sí
  Crear, editar y desactivar productos          Sí          Sí            No
  Crear, editar y desactivar ubicaciones        Sí          Sí            No
  Consultar y registrar movimientos             Sí          Sí            No
  Consultar y administrar usuarios/roles        Sí          No            No

Los permisos se verifican en el backend. La interfaz también oculta las
opciones que no corresponden al rol, pero la seguridad no depende
únicamente de esa presentación visual.

## API REST

La documentación interactiva generada por FastAPI está disponible en
`/docs`.

  ---------------------------------------------------------------------------------------
  Ruta                                    Método                  Descripción
  --------------------------------------- ----------------------- -----------------------
  `/api/auth/me`                          GET                     Devuelve el perfil y
                                                                  rol del usuario
                                                                  autenticado.

  `/api/dashboard/summary`                GET                     Indicadores y actividad
                                                                  reciente.

  `/api/productos`                        GET, POST               Listar/buscar y crear
                                                                  productos.

  `/api/productos/{product_id}`           PUT, DELETE             Actualizar o desactivar
                                                                  un producto.

  `/api/ubicaciones`                      GET, POST               Listar y crear
                                                                  ubicaciones.

  `/api/ubicaciones/{location_id}`        GET, PUT, DELETE        Consultar, actualizar o
                                                                  desactivar una
                                                                  ubicación.

  `/api/inventario`                       GET                     Consultar existencias,
                                                                  con filtros opcionales
                                                                  por producto o
                                                                  ubicación.

  `/api/movimientos`                      GET, POST               Consultar historial y
                                                                  registrar
                                                                  entradas/salidas.

  `/api/reportes/stock-por-categoria`     GET                     Unidades y valor por
                                                                  categoría.

  `/api/reportes/stock-bajo`              GET                     Productos en o por
                                                                  debajo del mínimo.

  `/api/reportes/movimientos-mensuales`   GET                     Entradas y salidas
                                                                  agrupadas por mes.

  `/api/usuarios`                         GET                     Listar usuarios;
                                                                  requiere rol `admin`.

  `/api/usuarios/{user_id}/rol`           PATCH                   Cambiar rol; requiere
                                                                  rol `admin`.
  ---------------------------------------------------------------------------------------

Las rutas protegidas requieren el token Bearer de Supabase Auth.

## Modelo de datos e inventario

  -----------------------------------------------------------------------
  Tabla                               Responsabilidad
  ----------------------------------- -----------------------------------
  `productos`                         Catálogo, SKU, categoría, precio
                                      referencial, estado y stock mínimo.

  `ubicaciones`                       Pasillo, estantería, nivel,
                                      columna, zona y capacidad en
                                      unidades.

  `movimientos`                       Historial de entradas/salidas,
                                      fecha, referencia y usuario que
                                      registró.

  `inventario`                        Existencia actual por combinación
                                      de producto y ubicación.

  `perfiles`                          Perfil de aplicación vinculado a
                                      `auth.users`, con rol.
  -----------------------------------------------------------------------

### Reglas de inventario

-   `movimientos` conserva el historial de operaciones.
-   Un trigger de PostgreSQL actualiza `inventario` al insertar entradas
    o salidas.
-   Las salidas se rechazan cuando superan el stock de esa combinación
    de producto y ubicación.
-   Las entradas se rechazan cuando exceden la capacidad configurada de
    la ubicación.
-   No se permite registrar movimientos para productos o ubicaciones
    inactivos.
-   La API no ofrece edición ni eliminación del historial de
    movimientos, preservando la trazabilidad.

## Despliegue

La configuración incluida contempla **Render para FastAPI** y **Vercel
para React + Vite**. La presencia de `render.yaml` y
`frontend/vercel.json` no significa que el despliegue ya esté publicado:
se deben crear los servicios y configurar las variables en las cuentas
correspondientes.

### Backend en Render

1.  Sube el repositorio a GitHub.
2.  En Render, crea un **Web Service** conectado al repositorio.
3.  Configura el directorio raíz como `backend` (el archivo
    `render.yaml` ya declara `rootDir: backend`).
4.  Comandos previstos:
    -   Build: `pip install -r requirements.txt`
    -   Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5.  Configura las variables:
    -   `DATABASE_URL`
    -   `SUPABASE_URL`
    -   `SUPABASE_ANON_KEY`
    -   `CORS_ORIGINS`
    -   `APP_ENV=production`
6.  Comprueba que `/health` responda correctamente y que `/docs` cargue.

### Frontend en Vercel

1.  Importa el mismo repositorio desde GitHub en Vercel.
2.  Configura **Root Directory** como `frontend`.
3.  Utiliza `npm run build` como comando de compilación y `dist` como
    directorio de salida.
4.  Configura:
    -   `VITE_SUPABASE_URL`
    -   `VITE_SUPABASE_ANON_KEY`
    -   `VITE_API_URL` con la URL HTTPS de Render terminada en `/api`.
5.  Vuelve a desplegar después de guardar las variables.

### Conexión entre servicios

-   En Render, configura `CORS_ORIGINS` con el origen exacto del sitio
    publicado en Vercel, sin agregar rutas como `/api`.
-   En Supabase Auth, agrega el dominio publicado de Vercel a las URL de
    redirección permitidas.
-   En los dos servicios, utiliza las credenciales del mismo proyecto
    Supabase.
-   No uses `localhost` como URL de API en el frontend de producción.

## Seguridad

-   No publiques archivos `.env` reales, contraseñas PostgreSQL ni
    claves privadas.
-   El frontend debe utilizar únicamente la clave pública
    anon/publishable de Supabase.
-   Nunca incluyas `service_role` en variables `VITE_*` ni en código del
    navegador.
-   Mantén `DATABASE_URL` exclusivamente en el backend.
-   Configura las variables sensibles desde los paneles de Render y
    Vercel.
-   Revisa y limita `CORS_ORIGINS` a los dominios que deban consumir la
    API.
-   Si una credencial real se expuso en un repositorio o captura
    pública, rótala desde el proveedor correspondiente.

## Validación y pruebas recomendadas

El archivo `ESTADO_DE_VALIDACION.txt` acompaña la entrega y distingue
comprobaciones estáticas realizadas de las pruebas pendientes en el
entorno real.

Antes de considerar el despliegue listo, valida:

1.  Registro, confirmación de correo e inicio de sesión.
2.  Consulta del perfil autenticado en `/api/auth/me`.
3.  Alta y edición de un producto.
4.  Alta y edición de una ubicación.
5.  Registro de una entrada y comprobación del aumento de existencias.
6.  Registro de una salida válida.
7.  Intento de salida superior al stock: debe ser rechazado.
8.  Intento de entrada que exceda la capacidad de ubicación: debe ser
    rechazado.
9.  Selección de un compartimiento en el almacén 3D y consulta de sus
    productos.
10. Acceso con rol `consulta` para verificar que no pueda registrar
    movimientos ni administrar usuarios.

No se debe afirmar que estas pruebas de producción fueron superadas
hasta ejecutarlas contra los servicios desplegados.

## Alcance y limitaciones

-   La escena 3D es una representación interactiva de estanterías y
    ubicaciones registradas en PostgreSQL; no representa un escaneo
    físico ni incorpora sensores IoT.
-   La capacidad de las ubicaciones se expresa en unidades.
-   La migración SQL incluida amplía un esquema existente y no sustituye
    un script inicial completo para una base vacía.
-   La ejecución local y el despliegue requieren configurar las
    variables de entorno de cada servicio.
-   Los productos, ubicaciones y movimientos insertados por el script
    están identificados como datos sintéticos de demostración.
