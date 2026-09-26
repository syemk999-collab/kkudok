import { parseReceiptText } from "./_lib/receiptParser.js";
import { randomUUID } from "node:crypto";

export const config = {
  api: {
    bodyParser: { sizeLimit: "12mb" },
  },
};

const allowedMimeTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const send = (response, status, payload) => {
  response.status(status).json(payload);
};

const readBody = (request) => {
  if (typeof request.body === "string") return JSON.parse(request.body);
  return request.body || {};
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const GEMINI_TOTAL_TIMEOUT_MS = 28_000;
const GEMINI_ATTEMPT_TIMEOUT_MS = 12_000;

// Never log the image, recognized text, provider response body, URL, or API key.
const logOcr = (requestId, event, details) => {
  console.info("[ocr]", { requestId, event, ...details });
};

const isHighDemandOrOverloaded = (status, message = "") => {
  const lower = String(message).toLowerCase();
  return (
    status === 503 ||
    status === 429 ||
    status === 500 ||
    lower.includes("high demand") ||
    lower.includes("spikes in demand") ||
    lower.includes("overloaded") ||
    lower.includes("quota") ||
    lower.includes("resource_exhausted") ||
    lower.includes("unavailable")
  );
};

const callSingleGeminiModel = async ({ model, imageBase64, mimeType, apiKey, signal }) => {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(apiKey);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || "image/jpeg",
                data: imageBase64,
              },
            },
            {
              text: "영수증 또는 결제 내역 이미지의 모든 텍스트를 보이는 그대로 정확히 추출(OCR)해주세요. 요약이나 설명 없이 텍스트 원문만 줄바꿈하여 출력하세요.",
            },
          ],
        },
      ],
    }),
    signal,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    const status = response.status || 500;
    const message = payload.error?.message || ("Gemini OCR 호출 실패 (" + status + ")");
    const error = new Error(message);
    error.status = status;
    throw error;
  }
  const candidate = payload.candidates?.[0]?.content?.parts?.find((part) => part.text);
  return candidate?.text || "";
};

const callGeminiVision = async ({ imageBase64, mimeType, apiKey, requestId }) => {
  const controller = new AbortController();
  const startedAt = Date.now();
  const timer = setTimeout(() => controller.abort(), GEMINI_TOTAL_TIMEOUT_MS);
  const defaultModel = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const candidateModels = Array.from(new Set([
    defaultModel,
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash",
    "gemini-3.6-flash",
  ].filter(Boolean)));

  let lastError = null;
  try {
    for (const model of candidateModels) {
      const attemptStartedAt = Date.now();
      const remainingMs = GEMINI_TOTAL_TIMEOUT_MS - (attemptStartedAt - startedAt);
      if (remainingMs <= 0) break;
      try {
        const rawText = await callSingleGeminiModel({
          model,
          imageBase64,
          mimeType,
          apiKey,
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(Math.min(GEMINI_ATTEMPT_TIMEOUT_MS, remainingMs)),
          ]),
        });
        logOcr(requestId, "provider_attempt", { provider: "gemini", model, outcome: "success", elapsedMs: Date.now() - attemptStartedAt });
        return rawText;
      } catch (err) {
        lastError = err;
        const status = Number(err.status) || null;
        const timedOut = err.name === "TimeoutError" || err.name === "AbortError";
        logOcr(requestId, "provider_attempt", {
          provider: "gemini", model, outcome: timedOut ? "timeout" : "error",
          status, elapsedMs: Date.now() - attemptStartedAt,
        });
        if (controller.signal.aborted) throw new DOMException("Gemini OCR timed out", "AbortError");
        // Changing models cannot fix invalid credentials, payment, or malformed requests.
        if ([400, 401, 402, 403].includes(status)) throw err;
        if (status === 429 || status === 408 || (status !== null && status >= 500)) {
          await sleep(500);
        }
      }
    }
    if (controller.signal.aborted) throw new DOMException("Gemini OCR timed out", "AbortError");
    if (lastError && isHighDemandOrOverloaded(lastError.status, lastError.message)) {
      const err = new Error("AI 모델 서비스에 일시적인 트래픽이 몰려 지연되고 있습니다. 잠시 후 다시 시도해 주시거나 결제 문자로 입력해 주세요.");
      err.isHighDemand = true;
      throw err;
    }
    throw lastError || new Error("Gemini OCR 호출에 실패했습니다.");
  } finally {
    clearTimeout(timer);
  }
};

const callGoogleVision = async ({ imageBase64, apiKey, requestId }) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  const startedAt = Date.now();
  try {
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          imageContext: { languageHints: ["ko", "en"] },
        }],
      }),
      signal: controller.signal,
    });
    const payload = await response.json();
    if (!response.ok || payload.responses?.[0]?.error) {
      const message = payload.responses?.[0]?.error?.message || payload.error?.message || "OCR 서비스 호출에 실패했습니다.";
      const error = new Error(message);
      error.status = response.status || 500;
      throw error;
    }
    logOcr(requestId, "provider_attempt", { provider: "google-vision", outcome: "success", elapsedMs: Date.now() - startedAt });
    return payload.responses?.[0]?.fullTextAnnotation?.text || payload.responses?.[0]?.textAnnotations?.[0]?.description || "";
  } catch (error) {
    logOcr(requestId, "provider_attempt", {
      provider: "google-vision", outcome: error.name === "AbortError" ? "timeout" : "error",
      status: Number(error.status) || null, elapsedMs: Date.now() - startedAt,
    });
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

export default async function handler(request, response) {
  // Support Cross-Origin Requests from mobile Capacitor apps (e.g. capacitor://localhost, http://localhost)
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (request.method === "OPTIONS") {
    if (typeof response.status === "function") {
      return response.status(204).end();
    }
    response.statusCode = 204;
    return response.end();
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST, OPTIONS");
    return send(response, 405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "POST 요청만 지원합니다." });
  }

  let body;
  try {
    body = readBody(request);
  } catch {
    return send(response, 400, { ok: false, code: "INVALID_JSON", message: "요청 형식이 올바르지 않습니다." });
  }

  const pastedText = String(body.text || "").trim();
  if (pastedText) {
    const parsed = parseReceiptText(pastedText);
    return send(response, parsed.ok ? 200 : 422, parsed);
  }

  const mimeType = String(body.mimeType || "").toLowerCase();
  const imageBase64 = String(body.imageBase64 || "").replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "");
  if (!allowedMimeTypes.has(mimeType)) {
    return send(response, 400, { ok: false, code: "UNSUPPORTED_IMAGE", message: "JPG, PNG, WEBP 이미지만 사용할 수 있습니다." });
  }
  if (!imageBase64) {
    return send(response, 400, { ok: false, code: "IMAGE_REQUIRED", message: "인식할 이미지가 없습니다." });
  }

  const estimatedBytes = Math.ceil(imageBase64.length * 0.75);
  if (estimatedBytes > MAX_IMAGE_BYTES) {
    return send(response, 413, { ok: false, code: "IMAGE_TOO_LARGE", message: "이미지는 8MB 이하만 사용할 수 있습니다." });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const visionKey = process.env.GOOGLE_VISION_API_KEY;
  const requestId = randomUUID();
  response.setHeader("X-Kkudok-Ocr-Request-Id", requestId);
  response.setHeader("Access-Control-Expose-Headers", "X-Kkudok-Ocr-Request-Id");
  if (!geminiKey && !visionKey) {
    logOcr(requestId, "complete", { outcome: "not_configured" });
    return send(response, 503, { ok: false, code: "OCR_NOT_CONFIGURED", message: "OCR 환경변수가 설정되지 않았습니다." });
  }

  const startedAt = Date.now();
  try {
    const normalizedMimeType = mimeType === "image/jpg" ? "image/jpeg" : mimeType;
    let rawText = "";
    if (geminiKey) {
      try {
        rawText = await callGeminiVision({ imageBase64, mimeType: normalizedMimeType, apiKey: geminiKey, requestId });
      } catch (geminiError) {
        if (visionKey && !geminiError.name?.includes("Abort")) {
          rawText = await callGoogleVision({ imageBase64, apiKey: visionKey, requestId });
        } else {
          throw geminiError;
        }
      }
    } else {
      rawText = await callGoogleVision({ imageBase64, apiKey: visionKey, requestId });
    }
    const parsed = parseReceiptText(rawText);
    logOcr(requestId, "complete", { outcome: parsed.ok ? "success" : "unrecognized", elapsedMs: Date.now() - startedAt });
    return send(response, parsed.ok ? 200 : 422, parsed);
  } catch (error) {
    const timedOut = error?.name === "AbortError" || error?.name === "TimeoutError";
    const providerStatus = Number(error?.status) || null;
    const configurationError = [401, 402, 403].includes(providerStatus);
    const code = timedOut ? "OCR_TIMEOUT" : configurationError ? "OCR_PROVIDER_CONFIGURATION" : "OCR_PROVIDER_ERROR";
    logOcr(requestId, "complete", { outcome: code, providerStatus, elapsedMs: Date.now() - startedAt });
    return send(response, timedOut ? 504 : configurationError ? 503 : 502, {
      ok: false,
      code,
      message: timedOut
        ? "이미지 인식 시간이 초과되었습니다. 다시 시도하거나 직접 입력해 주세요."
        : configurationError
          ? "이미지 인식 서비스 설정을 확인해야 합니다. 직접 입력을 이용해 주세요."
          : error?.isHighDemand
            ? error.message
            : "이미지 인식을 완료하지 못했습니다. 다시 시도하거나 직접 입력해 주세요.",
    });
  }
}
