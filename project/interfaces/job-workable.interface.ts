interface JobLike {
  workable(network: string): Promise<{ canWork: boolean; args: string }>;
}