// Apeluri către serverul Gustos. Erorile au un mesaj în română (din „detail”, când există).

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body) {
  const isForm = body instanceof FormData;
  let response;
  try {
    response = await fetch(path, {
      method,
      headers: body === undefined || isForm ? undefined : { "Content-Type": "application/json" },
      body: body === undefined || isForm ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Serverul nu răspunde. Verifică dacă Gustos rulează.", 0);
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof data?.detail === "string" ? data.detail : "A apărut o eroare. Încearcă din nou.";
    throw new ApiError(detail, response.status);
  }
  return data;
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  put: (path, body) => request("PUT", path, body),
  patch: (path, body) => request("PATCH", path, body),
  del: (path) => request("DELETE", path),
  upload: (path, file) => {
    const form = new FormData();
    form.append("file", file);
    return request("POST", path, form);
  },
  uploadMany: (path, files) => {
    const form = new FormData();
    for (const file of files) form.append("files", file);
    return request("POST", path, form);
  },
};
