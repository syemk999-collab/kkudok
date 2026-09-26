import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/ocr.js";

const createResponse = () => ({
  statusCode: 200,
  headers: {},
  payload: null,
  setHeader(key, value) { this.headers[key] = value; },
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.payload = payload; return this; },
});

test("결제 문자는 외부 OCR 키 없이 동일한 파서로 처리한다", async () => {
  const request = { method: "POST", body: { text: "상품명 티빙\n결제금액 13,500원\n다음 결제일 10월 9일" } };
  const response = createResponse();

  await handler(request, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.data.name, "티빙");
  assert.equal(response.payload.data.plan, "스탠다드");
  assert.equal(response.payload.data.dueDay, 9);
});

test("이미지 OCR 키가 없으면 설정 오류를 명확히 반환한다", async () => {
  const prevVision = process.env.GOOGLE_VISION_API_KEY;
  const prevGemini = process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_VISION_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const request = { method: "POST", body: { mimeType: "image/png", imageBase64: "aGVsbG8=" } };
    const response = createResponse();

    await handler(request, response);

    assert.equal(response.statusCode, 503);
    assert.equal(response.payload.code, "OCR_NOT_CONFIGURED");
  } finally {
    if (prevVision) process.env.GOOGLE_VISION_API_KEY = prevVision;
    if (prevGemini) process.env.GEMINI_API_KEY = prevGemini;
  }
});

test("Gemini 모델이 high demand(503)를 반환하면 다음 fallback 모델로 전환하여 성공한다", async () => {
  const originalFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "test-mock-key";
  let callCount = 0;
  const calledUrls = [];

  globalThis.fetch = async (url) => {
    callCount++;
    calledUrls.push(url);
    if (callCount === 1) {
      return {
        ok: false,
        status: 503,
        json: async () => ({
          error: {
            code: 503,
            message: "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
            status: "UNAVAILABLE",
          },
        }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: "넷플릭스 17,000원 결제완료 10월 15일" }],
            },
          },
        ],
      }),
    };
  };

  try {
    const request = {
      method: "POST",
      body: {
        mimeType: "image/png",
        imageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      },
    };
    const response = createResponse();
    await handler(request, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.payload.ok, true);
    assert.equal(response.payload.data.name, "Netflix");
    assert.equal(response.payload.data.plan, "프리미엄");
    assert.equal(callCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.GEMINI_API_KEY;
  }
});

test("모든 Gemini 모델이 high demand(503)를 반환하면 사용자 친화적인 한글 안내를 반환한다", async () => {
  const originalFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "test-mock-key";

  globalThis.fetch = async () => ({
    ok: false,
    status: 503,
    json: async () => ({
      error: {
        code: 503,
        message: "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
      },
    }),
  });

  try {
    const request = {
      method: "POST",
      body: {
        mimeType: "image/png",
        imageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      },
    };
    const response = createResponse();
    await handler(request, response);

    assert.equal(response.statusCode, 502);
    assert.equal(response.payload.ok, false);
    assert.match(response.payload.message, /일시적인 트래픽이 몰려 지연/);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.GEMINI_API_KEY;
  }
});

test("인증 및 요청 오류는 다른 모델로 재시도하지 않고 민감정보 없이 진단한다", async () => {
  const originalFetch = globalThis.fetch;
  const originalInfo = console.info;
  const previousGemini = process.env.GEMINI_API_KEY;
  const previousVision = process.env.GOOGLE_VISION_API_KEY;
  process.env.GEMINI_API_KEY = "secret-test-key";
  delete process.env.GOOGLE_VISION_API_KEY;
  const logs = [];
  console.info = (...args) => logs.push(args);
  const imageBase64 = "sensitive-test-image-base64";

  try {
    for (const status of [400, 403]) {
      let calls = 0;
      globalThis.fetch = async () => {
        calls += 1;
        return { ok: false, status, json: async () => ({ error: { message: "invalid API key" } }) };
      };
      const response = createResponse();
      await handler({ method: "POST", body: { mimeType: "image/png", imageBase64 } }, response);
      assert.equal(calls, 1);
      assert.equal(response.statusCode, status === 403 ? 503 : 502);
      assert.equal(response.payload.code, status === 403 ? "OCR_PROVIDER_CONFIGURATION" : "OCR_PROVIDER_ERROR");
      assert.ok(response.headers["X-Kkudok-Ocr-Request-Id"]);
    }
    const diagnostics = JSON.stringify(logs);
    assert.ok(diagnostics.includes("provider_attempt"));
    assert.ok(diagnostics.includes("elapsedMs"));
    assert.ok(!diagnostics.includes("secret-test-key"));
    assert.ok(!diagnostics.includes(imageBase64));
    assert.ok(!diagnostics.includes("invalid API key"));
  } finally {
    globalThis.fetch = originalFetch;
    console.info = originalInfo;
    if (previousGemini === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousGemini;
    if (previousVision === undefined) delete process.env.GOOGLE_VISION_API_KEY;
    else process.env.GOOGLE_VISION_API_KEY = previousVision;
  }
});

test("응답 없는 Gemini 모델은 시도별 제한 뒤 다음 모델로 전환한다", async () => {
  const originalFetch = globalThis.fetch;
  const previousGemini = process.env.GEMINI_API_KEY;
  const previousVision = process.env.GOOGLE_VISION_API_KEY;
  process.env.GEMINI_API_KEY = "test-mock-key";
  delete process.env.GOOGLE_VISION_API_KEY;
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    calls += 1;
    if (calls === 1) {
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true });
      });
    }
    return { ok: true, status: 200, json: async () => ({
      candidates: [{ content: { parts: [{ text: "넷플릭스 17,000원 결제완료 10월 15일" }] } }],
    }) };
  };
  try {
    const response = createResponse();
    await handler({ method: "POST", body: { mimeType: "image/png", imageBase64: "aGVsbG8=" } }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.payload.data.name, "Netflix");
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousGemini === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousGemini;
    if (previousVision === undefined) delete process.env.GOOGLE_VISION_API_KEY;
    else process.env.GOOGLE_VISION_API_KEY = previousVision;
  }
});
