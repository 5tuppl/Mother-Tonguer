export class BackendError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "BackendError";
    this.status = status;
  }
}

export function jsonError(error: unknown) {
  if (error instanceof BackendError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json({ error: "Unexpected backend error" }, { status: 500 });
}
