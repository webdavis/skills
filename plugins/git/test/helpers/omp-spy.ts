type Handler = (event: object, context: object) => unknown;

export class OmpSpy {
  private readonly handlers = new Map<string, Handler[]>();

  on(name: string, handler: Handler): void {
    this.handlers.set(name, [...(this.handlers.get(name) ?? []), handler]);
  }

  startSession(context: object): Promise<unknown[]> {
    return this.emit("session_start", {}, context);
  }

  agentCalls(toolName: string, input: object, context: object): Promise<unknown[]> {
    return this.emit("tool_call", { type: "tool_call", toolCallId: "call-1", toolName, input }, context);
  }

  private emit(name: string, event: object, context: object): Promise<unknown[]> {
    return Promise.all((this.handlers.get(name) ?? []).map((handler) => handler(event, context)));
  }
}
