export interface DeployRequest {
  project: string;
}

export interface DeployResponse {
  deploymentId: string;
  message?: string; // Optional now
}