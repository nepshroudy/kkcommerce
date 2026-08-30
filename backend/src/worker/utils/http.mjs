export function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers,
  });
}

export async function readJson(request) {
  const contentType = request.headers.get("content-type") || "";

  if (!contentType.toLowerCase().includes("application/json")) {
    throw Object.assign(
      new Error("Content-Type must be application/json"),
      { status: 415 }
    );
  }

  try {
    return await request.json();
  } catch {
    throw Object.assign(new Error("Invalid JSON body"), { status: 400 });
  }
}

export function numberId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function errorResponse(error, fallback = "Request failed") {
  const status = Number(error?.status) || 500;

  return json(
    {
      message: error?.message || fallback,
    },
    status
  );
}
