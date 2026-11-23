type Handler = (event: object, context: object) => unknown;

export class OmpSpy {
  private readonly handlers = new Map<string, Handler>();

  on(name: string, handler: Handler): void {
    this.handlers.set(name, handler);
  }

  startSession(context: object): unknown {
    return this.handlers.get("session_start")?.({}, context);
  }
}
