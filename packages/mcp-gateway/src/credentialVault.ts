export type AgentCredential = {
  agentId: string;
  apiKey: string;
  createdAt: Date;
};

export class CredentialVault {
  private readonly credentials = new Map<string, AgentCredential>();

  setAgentCredential(agentId: string, apiKey: string) {
    const credential = {
      agentId,
      apiKey,
      createdAt: new Date()
    };

    this.credentials.set(agentId, credential);

    return credential;
  }

  getAgentCredential(agentId: string) {
    return this.credentials.get(agentId) ?? null;
  }

  deleteAgentCredential(agentId: string) {
    return this.credentials.delete(agentId);
  }

  clear() {
    this.credentials.clear();
  }
}

export function createCredentialVault() {
  return new CredentialVault();
}
