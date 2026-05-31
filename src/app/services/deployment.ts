import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { DeployRequest, DeployResponse } from './deployment.interface';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Deployment {
  private readonly apiUrl = 'http://localhost:8080/api/deploy';

  private readonly http = inject(HttpClient);

  // Initiate a deployment by sending a POST request to the backend API
  launchDeployment(payload: DeployRequest): Observable<DeployResponse> {
    return this.http.post<DeployResponse>(this.apiUrl, payload);
  }

  getLogStream(deploymentId: string): Observable<string> {
    return new Observable<string>((observer) => {
      const eventSource = new EventSource(`${this.apiUrl}/stream/${deploymentId}`);

      const handleEvent = (event: MessageEvent) => {
        try {
          const logObject = JSON.parse(event.data);
          observer.next(logObject.message);
        } catch (e) {
          observer.next(event.data);
        }
      };

      eventSource.addEventListener('LOG', handleEvent);
      eventSource.onmessage = handleEvent;

      eventSource.onerror = (error) => {
        observer.error(error);
        eventSource.close();
      };

      return () => {
        eventSource.close();
      };
    });
  }
}
