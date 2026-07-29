# Portfolio - Daniel Méndez (DeployStream)

Repositorio del código fuente de mi portfolio personal. Este proyecto funciona como una carta de presentación y como una prueba práctica de arquitectura y automatización, conectando el desarrollo de software con la infraestructura en un entorno de producción real.

## Perfil

Desarrollador Junior especializado en backend, bases de datos y administración de servidores (DevOps). Estudiante de Ingeniería Informática enfocado en la resolución de incidencias en caliente y la optimización de sistemas. 

## Stack Tecnológico

* **Backend y Bases de Datos:** Java, Spring Boot, Python, PostgreSQL, MySQL, Oracle DB.
* **Frontend:** Angular.
* **DevOps y Middleware:** Docker, Jenkins, Git, MuleSoft, WebLogic, WSO2, OpenAPI/YAML.
* **Herramientas IA:** Spring AI / LangChain, Copilot, OpenCode.

## Arquitectura y Deploy Lab

El proyecto integra una sección de demostración técnica (Deploy Lab) que interactúa con un entorno real en producción. Las características principales a nivel de arquitectura incluyen:

* **Disparo Asíncrono:** La interfaz (Angular) gestiona bloqueos de estado mediante *Signals*, mientras el backend (Spring Boot) utiliza `@Async` para delegar la carga a la API de Jenkins sin interrumpir la experiencia del usuario.
* **Eventos en Tiempo Real (SSE):** Tras ejecutar el pipeline en Jenkins, el backend se conecta al servidor para capturar las trazas (logs) y transmitirlas directamente a la terminal del cliente mediante Server-Sent Events.
* **Monitorización de Base de Datos y Rollback:** El sistema rastrea y muestra los cambios en los registros de PostgreSQL en tiempo real. Un proceso en segundo plano gestiona la cuenta atrás para la destrucción del entorno efímero, restaurando la base de datos a su estado original de forma automática.

## Otros Proyectos Integrados

El portfolio hace referencia a infraestructura y aplicaciones complementarias:
* **Home Lab:** Servidor propio (Debian) enfocado en alta disponibilidad y seguridad (proxies inversos, fail2ban, túneles de Cloudflare) que aloja builds, automatizaciones con n8n y gestión multimedia.
* **MacroAI (Contador de Calorías IA):** MVP en Flutter que consume un backend propio orquestado con n8n y PostgreSQL.

## Contacto

* **Email:** daniel.mendezz.arias@gmail.com
* **LinkedIn:** [dma2002](https://linkedin.com/in/dma2002)
* **GitHub:** [damen02info](https://github.com/damen02info)