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

  launchDeployment(payload: DeployRequest): Observable<DeployResponse> {
    return this.http.post<DeployResponse>(this.apiUrl, payload);
  }
}
