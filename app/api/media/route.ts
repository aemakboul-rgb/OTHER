export async function GET() {
  return Response.json({ error: "Media storage is not configured yet." }, { status: 404 });
}
