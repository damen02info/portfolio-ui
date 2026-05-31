export interface DeployRequest {
  project: string;
  deploymentId: string;
}

export interface DeployResponse {
  deploymentId: string;
  message?: string; // Optional now
}
