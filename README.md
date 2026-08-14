# 🚀 Portfolio - Frontend Web

Frontend de mi **Portfolio**, desarrollado con Angular y pensado como la parte visual del proyecto.

Aquí es donde se junta todo: el portfolio, el **Deploy Lab**, los cambios visuales del entorno y, sobre todo, la posibilidad de ver en directo qué está haciendo Jenkins mientras se ejecuta un despliegue.

La idea es que el portfolio no sea simplemente una web estática, sino que tenga **infraestructura real funcionando por detrás** y que puedas interactuar con ella.

## 🛠️ Tech Stack

* **Angular**
* **TypeScript**
* **Angular Signals**
* **HTTP / REST**
* **Server-Sent Events (SSE)**
* **SCSS**
* **CSS Variables**

## 🎨 ¿Qué hace el frontend?

El frontend tiene dos objetivos principales:

1. Servir como interfaz del portfolio.
2. Actuar como cliente del **Deploy Lab** para interactuar con el backend y la infraestructura de CI/CD.

Desde la propia web se pueden lanzar despliegues y ver cómo cambia el entorno mientras todo ocurre.

## ⚡ Estado reactivo con Angular Signals

La aplicación utiliza **Angular Signals** para gestionar determinados estados de la interfaz.

Por ejemplo, cuando se inicia un despliegue, la UI cambia inmediatamente de estado y bloquea las acciones que podrían provocar una segunda ejecución mientras la primera sigue en marcha.

Esto evita cosas como:

```text
Click
  │
  ├── Deploy #1
  │
  ├── Deploy #2  ❌
  │
  └── Deploy #3  ❌
```

y permite mantener un flujo controlado mientras el backend trabaja de forma asíncrona.

## 📡 Logs de Jenkins en tiempo real

Una de las partes principales del frontend es la terminal integrada en el **Deploy Lab**.

Para ello se utiliza la API `EventSource` del navegador junto con **Server-Sent Events (SSE)**.

El flujo es básicamente:

```text
Jenkins
   │
   │ Pipeline logs
   ▼
Spring Boot
   │
   │ SSE
   ▼
EventSource
   │
   ▼
DeployStream Terminal
```

Los logs van llegando al navegador a medida que se generan y se muestran secuencialmente en la interfaz.

Sin polling. Sin estar preguntando cada pocos segundos si hay novedades.

Simplemente:

**Jenkins genera → Backend recibe → Frontend muestra.**

## 🎨 Cambios visuales dinámicos

El frontend también está conectado con el sistema de configuración de DeployStream.

Cuando un despliegue modifica determinados valores de `app_config`, la interfaz puede actualizar dinámicamente sus **CSS Variables** para reflejar el nuevo estado del entorno.

Por ejemplo:

```text
Deploy
  ↓
Backend
  ↓
PostgreSQL
  ↓
Configuración actualizada
  ↓
Frontend
  ↓
CSS Variables
  ↓
🎨 Nuevo entorno
```

Cuando finaliza el tiempo del despliegue y el backend ejecuta el **rollback**, el frontend vuelve a reflejar automáticamente la configuración original.

La gracia está precisamente en que el cambio no sea solamente visual: **forma parte de un flujo real de backend + base de datos + CI/CD + frontend.**

## 🧩 Arquitectura

A nivel general, el frontend se comunica con el backend mediante dos canales principales:

```text
                  ┌─────────────────┐
                  │    Angular UI   │
                  └────────┬────────┘
                           │
                 ┌─────────┴─────────┐
                 │                   │
              REST/HTTP              SSE
                 │                   │
                 ▼                   ▼
          ┌─────────────────────────────┐
          │       Spring Boot API       │
          └──────────────┬──────────────┘
                         │
                  ┌──────┴──────┐
                  │             │
                  ▼             ▼
             PostgreSQL      Jenkins
```

Esto permite mantener separadas las responsabilidades: Angular se ocupa de la interfaz y la experiencia de usuario, mientras que el backend coordina la lógica, el estado y la infraestructura.

## 🔧 Requisitos

Para ejecutar el frontend necesitas:

* **Node.js 18+**
* **NPM** o **Yarn**
* **Angular CLI** compatible con el proyecto
* Backend de **DeployStream** ejecutándose

## ⚙️ Configuración

La URL del backend se configura mediante `environment.ts`.

Ejemplo:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api/v1',
  sseUrl: 'http://localhost:8080/api/v1/deploy/logs/stream'
};
```

A partir de estas URLs, Angular sabe dónde enviar las peticiones REST y dónde establecer la conexión SSE para recibir los logs del pipeline.

## 🎯 ¿Por qué hacerlo así?

La idea detrás de este frontend era alejarse un poco del típico portfolio:

> "Aquí tienes mi CV, mis proyectos y un formulario de contacto."

En su lugar, **DeployStream convierte el propio portfolio en una pequeña demo de infraestructura**.

Puedes interactuar con él, lanzar procesos reales, ver logs en directo y observar cómo el sistema cambia y recupera su estado automáticamente.

Al final, el frontend es solamente la parte visible de todo lo que está ocurriendo detrás.
