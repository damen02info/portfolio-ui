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

  // We use a signal to store the logs received from the backend in real-time
  readonly logs = signal<string[]>([]);

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
      deploymentId: deploymentIdGen
    };

    console.log('Solicitando despliegue para el proyecto: ' + payload.project);

    // We subscribe to the Observable returned by the deployment service to handle the asynchronous response
    this.deploymentService.launchDeployment(payload).subscribe({
      next: (response) => {
        console.log('Suscripción al stream de logs iniciada para el deployment ID: ' + deploymentIdGen,);
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

        // We update the logs signal by appending the new log line to the existing logs array
        this.logs.update((currentLogs) => [...currentLogs, newLogLine]);

        // If the log line indicates that the deployment has finished, we can unlock the UI
        if (
          newLogLine.includes('Pipeline finalizado') ||
          newLogLine.includes('SUCCESS') ||
          newLogLine.includes('FAILURE')
        ) {
          console.log('Despliegue finalizado. Desbloqueando la UI.');
          this.isLocked.set(false);
          isDeploymentComplete = true;
        }
      },
      error: (err) => {
        console.error('Error en el stream de datos SSE (Conexión cerrada o interrumpida):', err);
        this.isLocked.set(false); // Liberamos la UI ante catástrofes de red
        isDeploymentComplete = true;
      },
      complete: () => {
        // If the stream completes without explicit completion message, unlock UI
        if (!isDeploymentComplete) {
          console.log('Stream SSE completado. Desbloqueando la UI.');
          this.isLocked.set(false);
          isDeploymentComplete = true;
        }
      },
    });
  }
}
