import { Component, inject, signal, OnDestroy, OnInit, WritableSignal } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import { Deployment } from '../../services/deployment';
import { DeployRequest } from '../../services/deployment.interface';
import { AutoScrollDirective } from '../../directives/auto-scroll.directive';
import { DbMonitor } from '../db-monitor/db-monitor';
import { environment } from '../../../environments/environment';

type ProjectId = 'flutter' | 'deployStream' | 'homeLab';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [AutoScrollDirective, DbMonitor],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {

  // Propiertes

  private readonly baseUrl = environment.apiUrl;
  private readonly deploymentService = inject(Deployment);
  private readonly http = inject(HttpClient);

  private configEventSource: EventSource | null = null;
  private countdownSubscription?: Subscription;

  readonly isLocked = signal(true);
  readonly countdown = signal(0);
  readonly logs = signal<string[]>([]);
  readonly selectedColor = signal<string | null>(null);

  readonly projectImages: Record<ProjectId, string[]> = {
    flutter: [
      '/assets/images/proyects/macroai/MacroAI_1.png',
      '/assets/images/proyects/macroai/MacroAI_2.png',
      '/assets/images/proyects/macroai/MacroAI_3.png',
    ],
    deployStream: [
      '/assets/images/proyects/portfolio/DeployStream_1.png',
      '/assets/images/proyects/portfolio/DeployStream_2.png',
      '/assets/images/proyects/portfolio/DeployStream_3.png',
    ],
    homeLab: [
      '/assets/images/proyects/homelab/homelab_1.png',
      '/assets/images/proyects/homelab/homelab_2.png',
      '/assets/images/proyects/homelab/homelab_3.png',
    ],
  };

  readonly carouselIndex: Record<ProjectId, WritableSignal<number>> = {
    flutter: signal(0),
    deployStream: signal(0),
    homeLab: signal(0),
  };

  private autoSlideIntervals: Record<ProjectId, number | undefined> = {
    homeLab: undefined,
    flutter: undefined,
    deployStream: undefined,
  };


  // Lyfecycle

  ngOnInit(): void {
    this.loadInitialColorFromDb();
    this.openConfigStream();

    this.startAutoSlide('flutter');
    this.startAutoSlide('deployStream');
    this.startAutoSlide('homeLab');

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
    this.countdownSubscription?.unsubscribe();

    this.stopAutoSlide('flutter');
    this.stopAutoSlide('deployStream');
    this.stopAutoSlide('homeLab');
  }


  // Interface events

  selectColor(hex: string): void {
    const normalized = (hex ?? '').trim();
    if (this.isValidColor(normalized)) {
      this.selectedColor.set(normalized);
    } else {
      console.warn('Color inválido (cliente):', normalized);
    }
  }

  onLaunchDeployment(): void {
    this.isLocked.set(true);
    this.logs.set([]);

    const deploymentIdGen = crypto.randomUUID();
    console.log(`Generado el nuevo ID de despliegue: ${deploymentIdGen}`);

    this.subscribeToLogs(deploymentIdGen);
    console.log(`Suscripción iniciada al stream con ID de despliegue: ${deploymentIdGen}`);

    const payload: DeployRequest = {
      project: 'portfolio-main-website',
      deploymentId: deploymentIdGen,
    };

    const color = this.selectedColor();
    if (color && this.isValidColor(color)) {
      payload.color = color;
    }

    console.log(`Solicitando despliegue para el proyecto: ${payload.project}`);

    this.deploymentService.launchDeployment(payload).subscribe({
      next: () => {
        console.log(
          `Suscripción al stream de logs iniciada para el deployment ID: ${deploymentIdGen}`,
        );
      },
      error: (errorResponse: HttpErrorResponse) => {
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
        this.isLocked.set(false);
      },
    });
  }


  // Deploy logic and state

  private subscribeToLogs(deploymentId: string): void {
    let isDeploymentComplete = false;

    this.deploymentService.getLogStream(deploymentId).subscribe({
      next: (newLogLine: string) => {
        console.log(`Nueva línea de log recibida: ${newLogLine}`);

        this.logs.update((logs) => [...logs, newLogLine]);

        if (/(Pipeline finalizado|SUCCESS|FAILURE)/.test(newLogLine)) {
          console.log('Despliegue finalizado.');
          isDeploymentComplete = true;

          if (newLogLine.includes('SUCCESS')) {
            console.log('Detected SUCCESS, starting countdown.');
            setTimeout(() => this.startCountdown(10), 1000);
          } else {
            this.isLocked.set(false);
          }
        }
      },
      error: (err: unknown) => {
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

  private startCountdown(seconds: number): void {
    console.log(`Starting countdown for ${seconds} seconds.`);

    sessionStorage.setItem('deploy_cooldown', (Date.now() + seconds * 1000).toString());

    this.isLocked.set(true);
    this.countdown.set(seconds);

    this.countdownSubscription?.unsubscribe();

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
    this.http.get<boolean>(`${this.baseUrl}/config/status/lock`).subscribe({
      next: (isLockedResponse) => {
        this.isLocked.set(isLockedResponse);
        if (!isLockedResponse) {
          sessionStorage.removeItem('deploy_cooldown');
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error al verificar el estado del candado', err);
        this.isLocked.set(true);
      },
    });
  }


  // Carousel logic

  nextSlide(id: ProjectId): void {
    const totalImages = this.projectImages[id].length;
    this.carouselIndex[id].update((current) => (current + 1) % totalImages);
    this.resetAutoSlide(id);
  }

  prevSlide(id: ProjectId): void {
    const totalImages = this.projectImages[id].length;
    this.carouselIndex[id].update((current) => (current - 1 + totalImages) % totalImages);
    this.resetAutoSlide(id);
  }

  goToSlide(id: ProjectId, index: number): void {
    this.carouselIndex[id].set(index);
    this.resetAutoSlide(id);
  }

  startAutoSlide(id: ProjectId): void {
    this.autoSlideIntervals[id] = window.setInterval(() => this.nextSlide(id), 3000);
  }

  stopAutoSlide(id: ProjectId): void {
    if (this.autoSlideIntervals[id] !== undefined) {
      window.clearInterval(this.autoSlideIntervals[id]);
      this.autoSlideIntervals[id] = undefined;
    }
  }

  resetAutoSlide(id: ProjectId): void {
    this.stopAutoSlide(id);
    this.startAutoSlide(id);
  }


  // Config, streams and colors

  private loadInitialColorFromDb(): void {
    this.http.get<unknown>(`${this.baseUrl}/config/COLOR`).subscribe({
      next: (payload) => {
        const color = this.extractColorFromPayload(payload);
        if (color) this.applyBackgroundColor(color);
      },
      error: () => console.debug('No se pudo leer el color inicial desde la BD'),
    });
  }

  private openConfigStream(): void {
    if (typeof EventSource === 'undefined') return;

    this.closeConfigStream();
    this.configEventSource = new EventSource(`${this.baseUrl}/dashboard/stream`);

    this.configEventSource.addEventListener('config-update', (event: Event) =>
      this.handleConfigEvent(event),
    );
    this.configEventSource.onmessage = (event: MessageEvent) => this.handleConfigEvent(event);
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
    if (color) this.applyBackgroundColor(color);
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

    this.selectedColor.set(color);
    document.documentElement.style.background = color;
    document.body.style.background = color;
    document.documentElement.style.setProperty('--deploy-bg', color);
  }

  private isValidColor(candidate: string | null): boolean {
    return !!candidate && /^#([A-Fa-f0-9]{6})$/.test(candidate);
  }
}
