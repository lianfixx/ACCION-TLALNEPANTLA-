const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function cleanText(value: unknown, max: number) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g, "").normalize("NFC").trim().slice(0, max)
    : "";
}

export function cleanEmail(value: unknown) {
  const email = cleanText(value, 254).toLowerCase();
  return EMAIL_RE.test(email) ? email : "";
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

export function requestIsSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const matches = new URL(origin).origin === new URL(request.url).origin;
    const fetchSite = request.headers.get("sec-fetch-site");
    return matches && (fetchSite === null || fetchSite === "same-origin");
  } catch {
    return false;
  }
}

export function requestHasJsonContentType(request: Request) {
  return request.headers.get("content-type")?.toLowerCase().startsWith("application/json") === true;
}

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("Request body exceeds the configured byte limit.");
    this.name = "RequestBodyTooLargeError";
  }
}

export class InvalidContentLengthError extends Error {
  constructor() {
    super("Content-Length is invalid.");
    this.name = "InvalidContentLengthError";
  }
}

export function assertDeclaredBodyWithinLimit(request: Request, maxBytes: number) {
  const header = request.headers.get("content-length");
  if (header === null) return;
  const value = header.trim();
  if (!/^\d+$/.test(value)) throw new InvalidContentLengthError();
  const declaredBytes = Number(value);
  if (!Number.isSafeInteger(declaredBytes)) throw new InvalidContentLengthError();
  if (declaredBytes > maxBytes) throw new RequestBodyTooLargeError();
}

export async function readJsonBody<T>(request: Request, maxBytes: number): Promise<T> {
  assertDeclaredBodyWithinLimit(request, maxBytes);
  if (!request.body) throw new SyntaxError("Missing JSON body.");

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let totalBytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel("body-too-large").catch(() => undefined);
        throw new RequestBodyTooLargeError();
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text) as T;
  } finally {
    reader.releaseLock();
  }
}

export function jsonBodyErrorResponse(error: unknown) {
  if (error instanceof RequestBodyTooLargeError) return noStoreJson({ error: "Solicitud demasiado grande." }, { status: 413 });
  if (error instanceof InvalidContentLengthError) return noStoreJson({ error: "Longitud de solicitud inválida." }, { status: 400 });
  return noStoreJson({ error: "Solicitud inválida." }, { status: 400 });
}

export function imageBytesMatchMime(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  if (mimeType === "image/webp") return bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  return false;
}

export function fileSignatureMime(bytes:Uint8Array,allowPdf=false){
  if(allowPdf&&new TextDecoder().decode(bytes.slice(0,5))==='%PDF-')return 'application/pdf';
  for(const type of ['image/jpeg','image/png','image/webp'] as const)if(imageBytesMatchMime(bytes,type))return type;
  return '';
}

/** Multipart may arrive without Content-Length; cap bytes before parsing it. */
export async function readBodyBytes(request:Request,maxBytes:number){
  assertDeclaredBodyWithinLimit(request,maxBytes);
  if(!request.body)throw new SyntaxError('Missing body.');
  const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel().catch(()=>undefined);throw new RequestBodyTooLargeError();}chunks.push(value);}}finally{reader.releaseLock();}
  const result=new Uint8Array(size);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.byteLength;}return result;
}

export function noStoreJson(data: unknown, init?: ResponseInit) {
  const response = Response.json(data, init);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

/** Prevent a stale form from submitting under another account opened in a second tab. */
export function matchesExpectedAccount(request:Request,accountId:string){
 const expected=request.headers.get("X-Expected-Account-Id");
 return expected===null||expected===accountId;
}
