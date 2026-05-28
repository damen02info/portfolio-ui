import { Component, inject, signal } from '@angular/core';
import { Deployment } from '../../services/deployment';
import { DeployRequest } from '../../services/deployment.interface';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly deploymentService = inject(Deployment);

  // We use a signal to manage the locked state of the UI
  readonly isLocked = signal<boolean>(false);

  private currentDeploymentId: string | null = null;

  onLaunchDeployment(): void {
    // UI block to prevent running multiple deployments at the same time
    this.isLocked.set(true);

    const payload: DeployRequest = {
      project: 'portfolio-main-website',
    };

    console.log('Solicitando despliegue para el proyecto: ' + payload.project);

    // We subscribe to the Observable returned by the deployment service to handle the asynchronous response
    this.deploymentService.launchDeployment(payload).subscribe({
      next: (response) => {
        this.currentDeploymentId = response.deploymentId;
        console.log(
          'Pipeline aceptado por Spring Boot de forma asíncrona. Track ID: ' +
            this.currentDeploymentId,
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
}
