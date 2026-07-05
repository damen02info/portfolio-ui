export interface DeployRequest {
  project: string;
  deploymentId: string;
    color?: string;
}

export interface DeployResponse {
  deploymentId: string;
  message?: string; // Optional now
}
