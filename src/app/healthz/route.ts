/** Liveness for the container healthcheck; touches nothing else. */
export function GET() {
  return Response.json({ status: "OK" });
}
