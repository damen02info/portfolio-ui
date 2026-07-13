import { Component, inject, signal, OnDestroy } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { Deployment } from '../../services/deployment';
import { DeployRequest } from '../../services/deployment.interface';
import { AutoScrollDirective } from '../../directives/auto-scroll.directive';
import { DbMonitor } from '../db-monitor/db-monitor';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  imports: [AutoScrollDirective, DbMonitor],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnDestroy {
  private readonly deploymentService = inject(Deployment);
  private readonly http = inject(HttpClient);

  private configEventSource: EventSource | null = null;

  // We use a signal to manage the locked state of the UI
  // Cambiar false por true
  readonly isLocked = signal<boolean>(true);
  readonly countdown = signal<number>(0);
  private countdownSubscription: Subscription | null = null;

  // We use a signal to store the logs received from the backend in real-time
  readonly logs = signal<string[]>([]);
  readonly selectedColor = signal<string | null>(null);

  ngOnInit(): void {
    this.loadInitialColorFromDb();
    this.openConfigStream();

    const cooldown = sessionStorage.getItem('deploy_cooldown');
    const timeRemaining = cooldown ? Math.ceil((parseInt(cooldown, 10) - Date.now()) / 1000) : 0;

    if (timeRemaining > 0) {
      this.startCountdown(timeRemaining);
    } else {
      this.checkServerStatus();
    }
  }

  ngOnDestroy(): void {
    this.closeConfigStream();
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
    }
  }

  selectColor(hex: string): void {
    const normalized = (hex ?? '').trim();
    if (this.isValidColor(normalized)) {
      this.selectedColor.set(normalized);
    } else {
      console.warn('Color inválido (cliente):', normalized);
    }
  }

  private isValidColor(candidate: string | null): boolean {
    return !!candidate && /^#([A-Fa-f0-9]{6})$/.test(candidate);
  }

  onLaunchDeployment(): void {
    // UI block to prevent running multiple deployments at the same time
    this.isLocked.set(true);
    // Clear previous logs
    this.logs.set([]);

    const deploymentIdGen = crypto.randomUUID();
    console.log('Generado el nuevo ID de despliegue: ' + deploymentIdGen);

    // Start listening to logs immediately to catch early messages
    this.subscribeToLogs(deploymentIdGen);
    console.log('Suscripcion iniciada al stream con ID de despliegue: ' + deploymentIdGen);

    const payload: DeployRequest = {
      project: 'portfolio-main-website',
      deploymentId: deploymentIdGen,
    };
    const color = this.selectedColor();
    if (color && this.isValidColor(color)) {
      payload.color = color;
    }

    console.log('Solicitando despliegue para el proyecto: ' + payload.project);

    // We subscribe to the Observable returned by the deployment service to handle the asynchronous response
    this.deploymentService.launchDeployment(payload).subscribe({
      next: (response) => {
        console.log(
          'Suscripción al stream de logs iniciada para el deployment ID: ' + deploymentIdGen,
        );
      },
      error: (errorResponse) => {
        if (errorResponse.status === 423) {
          console.warn(
            'El servidor rechazó la solicitud: El sistema ya se encuentra bloqueado por otra tarea.',
          );
        } else if (errorResponse.status === 400) {
          console.error('Error en la petición: Parámetro "project" ausente o incorrecto.');
        } else {
          console.error(
            'Error de comunicación o fallo de red general con el backend:',
            errorResponse,
          );
        }
        // Unlock the UI in case of error
        this.isLocked.set(false);
      },
    });
  }

  // This method subscribes to the log stream for the given deployment ID and updates the logs signal in real-time
  private subscribeToLogs(deploymentId: string): void {
    let isDeploymentComplete = false;

    this.deploymentService.getLogStream(deploymentId).subscribe({
      next: (newLogLine) => {
        console.log('Nueva línea de log recibida: ' + newLogLine);

        this.logs.update((currentLogs) => [...currentLogs, newLogLine]);

        if (
          newLogLine.includes('Pipeline finalizado') ||
          newLogLine.includes('SUCCESS') ||
          newLogLine.includes('FAILURE')
        ) {
          console.log('Despliegue finalizado.');
          isDeploymentComplete = true;

          if (newLogLine.includes('SUCCESS')) {
            setTimeout(() => {
              console.log('Starting countdown now.');
              this.startCountdown(10);
            }, 1000);
          } else {
            this.isLocked.set(false);
          }
        }
      },
      error: (err) => {
        console.error('Error en el stream de datos SSE (Conexión cerrada o interrumpida):', err);
        this.isLocked.set(false);
        isDeploymentComplete = true;
      },
      complete: () => {
        if (!isDeploymentComplete) {
          console.log('Stream SSE completado.');
          this.isLocked.set(false);
          isDeploymentComplete = true;
        }
      },
    });
  }

  // This method loads the initial color from the database and applies it to the UI if valid
  private loadInitialColorFromDb(): void {
    this.http.get<unknown>('http://localhost:8080/api/config/COLOR').subscribe({
      next: (payload) => {
        const color = this.extractColorFromPayload(payload);
        if (color) {
          this.applyBackgroundColor(color);
        }
      },
      error: () => {
        console.debug('No se pudo leer el color inicial desde la BD');
      },
    });
  }

  private openConfigStream(): void {
    if (typeof EventSource === 'undefined') {
      return;
    }

    this.closeConfigStream();

    this.configEventSource = new EventSource('http://localhost:8080/api/dashboard/stream');

    this.configEventSource.addEventListener('config-update', (event: Event) => {
      this.handleConfigEvent(event);
    });

    this.configEventSource.onmessage = (event: MessageEvent) => {
      this.handleConfigEvent(event);
    };
  }

  private closeConfigStream(): void {
    if (this.configEventSource) {
      try {
        this.configEventSource.close();
      } catch {}
      this.configEventSource = null;
    }
  }

  private handleConfigEvent(event: Event): void {
    const messageEvent = event as MessageEvent;
    const rawData = messageEvent.data;

    let payload: unknown = rawData;

    if (typeof rawData === 'string') {
      try {
        payload = JSON.parse(rawData);
      } catch {
        payload = rawData;
      }
    }

    const color = this.extractColorFromPayload(payload);
    if (color) {
      this.applyBackgroundColor(color);
    }
  }

  private extractColorFromPayload(payload: unknown): string | null {
    if (typeof payload === 'string') {
      return this.isValidColor(payload) ? payload : null;
    }

    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const record = payload as Record<string, unknown>;

    const candidate =
      record['configValue'] ?? record['config_value'] ?? record['value'] ?? record['color'];

    if (typeof candidate === 'string' && this.isValidColor(candidate)) {
      return candidate;
    }

    return null;
  }

  private applyBackgroundColor(color: string): void {
    if (!this.isValidColor(color)) return;
    // console.log('applyBackgroundColor called', color, new Error().stack); // Debugging line, can be removed in production

    this.selectedColor.set(color);
    document.documentElement.style.background = color;
    document.body.style.background = color;
    document.documentElement.style.setProperty('--deploy-bg', color);
  }

  private startCountdown(seconds: number): void {
    console.log(`Starting countdown for ${seconds} seconds.`);

    sessionStorage.setItem('deploy_cooldown', (Date.now() + seconds * 1000).toString());

    this.isLocked.set(true);
    this.countdown.set(seconds);

    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
    }

    this.countdownSubscription = interval(1000)
      .pipe(take(seconds + 1))
      .subscribe(() => {
        const currentCount = this.countdown();
        if (currentCount > 0) {
          this.countdown.set(currentCount - 1);
        } else {
          this.isLocked.set(false);
          sessionStorage.removeItem('deploy_cooldown');
          this.countdownSubscription?.unsubscribe();
        }
      });
  }

  private checkServerStatus(): void {
    this.http.get<boolean>('http://localhost:8080/api/config/status/lock').subscribe({
      next: (isLockedResponse) => {
        this.isLocked.set(isLockedResponse);

        if (!isLockedResponse) {
          sessionStorage.removeItem('deploy_cooldown');
        }
      },
      error: (err) => {
        console.error('Error al verificar el estado del candado', err);
        this.isLocked.set(true);
      },
    });
  }
}
