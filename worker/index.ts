/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, isImageOptimizationPath, parseImageParams, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { purgeExpiredData } from "@/lib/retention";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  BUCKET: R2Bucket;
  IMAGES?: ImagesBinding;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    globalThis.__ACTION_JUVENIL_SITE_ENV__ = env;
    const url = new URL(request.url);
    const localDevelopment = ["localhost", "127.0.0.1", "[::1]", "terminal.local"].includes(url.hostname);
    if (url.protocol !== "https:" && !localDevelopment) {
      // Do not replay a submitted password or private form through a redirect.
      if (!["GET", "HEAD"].includes(request.method)) return new Response("Usa la dirección HTTPS para enviar datos.", { status: 403, headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" } });
      url.protocol = "https:";
      return Response.redirect(url.href, 308);
    }
    if (["/favicon.ico","/apple-touch-icon.png","/apple-touch-icon-precomposed.png"].includes(url.pathname) && ["GET","HEAD"].includes(request.method)) {
      return new Response(null,{status:308,headers:{Location:new URL("/images/real/pan-logo-oficial.png",url).href,"Cache-Control":"public, max-age=86400","X-Content-Type-Options":"nosniff",...(url.protocol==='https:'?{"Strict-Transport-Security":"max-age=31536000"}:{})}});
    }
    const nonce = crypto.randomUUID().replaceAll("-", "");
    const contentSecurityPolicy = buildContentSecurityPolicy(nonce);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
    const securedRequest = new Request(request, { headers: requestHeaders });

    // Vinext serves public images itself in development, where ASSETS is absent.
    if (isImageOptimizationPath(url.pathname) && env.ASSETS) {
      const images = env.IMAGES;
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      if (!["GET", "HEAD"].includes(request.method)) return new Response(null, {status:405,headers:{Allow:"GET, HEAD","Cache-Control":"no-store"}});
      // Bound transform variants and keep private APIs entirely outside this endpoint.
      const qualities = [75, 85, 90];
      const params = parseImageParams(url, allowedWidths, qualities);
      const source = params?.imageUrl ?? "";
      if (!params || !/^\/(?:images|_next\/static\/media)\/[A-Za-z0-9_./-]+\.(?:png|jpe?g|webp|avif|gif)$/i.test(source) || source.split("/").includes("..") || source.includes("//")) {
        return secureResponse(securedRequest, new Response("Imagen no permitida.", {status:400,headers:{"Cache-Control":"no-store","Content-Type":"text/plain; charset=utf-8"}}), contentSecurityPolicy);
      }
      const imageResponse = await handleImageOptimization(securedRequest, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, securedRequest.url))),
        transformImage: images ? async (body, { width, format, quality }) => {
          const result = await images.input(body).transform(width > 0 ? { width } : {}).output({ format: format as ImageOutputOptions["format"], quality });
          return result.response();
        } : undefined,
      }, allowedWidths, {qualities});
      return secureResponse(securedRequest, imageResponse, imageResponse.headers.get("Content-Security-Policy") ?? contentSecurityPolicy);
    }

    return secureResponse(securedRequest, await handler.fetch(securedRequest, env, ctx), contentSecurityPolicy);
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    globalThis.__ACTION_JUVENIL_SITE_ENV__ = env;
    ctx.waitUntil(purgeExpiredData("system:scheduled", "scheduled", controller.scheduledTime));
  },
};

function buildContentSecurityPolicy(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

function secureResponse(request: Request, response: Response, contentSecurityPolicy: string) {
  const secured = new Response(response.body, response);
  secured.headers.set("Content-Security-Policy", response.headers.get("Content-Security-Policy")?.startsWith("sandbox;") ? response.headers.get("Content-Security-Policy")! : contentSecurityPolicy);
  secured.headers.set("X-Content-Type-Options", "nosniff");
  secured.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  secured.headers.set("X-Frame-Options", "DENY");
  secured.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  secured.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  secured.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  const path = new URL(request.url).pathname;
  if (request.headers.get("cookie")?.includes("__Host-apjt_session=") || path.startsWith("/mi-comision") || path.startsWith("/api/espacio") || path === "/crear-cuenta" || path === "/api/registro-cuenta" || path === "/ingresar" || path === "/cuenta" || path.startsWith("/participacion") || path.startsWith("/admin") || path.startsWith("/api/admin") || path.startsWith("/api/incorporaciones")) {
    secured.headers.set("Cache-Control", "private, no-store");
    secured.headers.set("Referrer-Policy", "no-referrer");
    const vary = new Set((secured.headers.get("Vary") ?? "").split(",").map(value=>value.trim()).filter(Boolean));
    vary.add("Cookie"); secured.headers.set("Vary", [...vary].join(", "));
  }
  if (new URL(request.url).protocol === "https:") secured.headers.set("Strict-Transport-Security", "max-age=31536000");
  return secured;
}

export default worker;
