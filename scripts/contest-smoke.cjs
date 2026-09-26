const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

fs.mkdirSync("artifacts/contest", { recursive: true });

const baseURL = process.env.CONTEST_BASE_URL || "http://127.0.0.1:4173";
const verifyRealOcr = process.env.CONTEST_VERIFY_OCR === "1";

async function assertNoHorizontalOverflow(page, label) {
  const result = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  assert.ok(
    result.scrollWidth <= result.clientWidth + 1,
    `${label}: horizontal overflow ${result.scrollWidth} > ${result.clientWidth}`
  );
}

async function readContestFlow(page) {
  return page.evaluate(() => {
    try {
      return JSON.parse(sessionStorage.getItem("kkudok-contest-flow-v2") || "null");
    } catch {
      return null;
    }
  });
}

async function verifyLanding(page, label) {
  await page.goto(baseURL, { waitUntil: "networkidle" });

  const heroHeading = page.locator("#contest-hero-title");
  await heroHeading.waitFor();
  const heroHeadingText = await heroHeading.innerText();
  assert.ok(heroHeadingText.includes("결제는 AI로 읽고,"));
  assert.ok(heroHeadingText.includes("절약액은 검증해서 보여줍니다."));

  for (const text of [
    "읽고, 안내하고, 근거를 보여줘요.",
    "새 결제도, 놓친 결제도. 직접 확인하고 등록하세요.",
    "내 구독에서 절약할 선택지를 찾아보세요.",
    "이번에는 직접 경험해보세요.",
  ]) {
    await page.getByText(text, { exact: true }).first().waitFor();
  }

  const heroVideo = page.locator(".contest-hero-phone video");
  await heroVideo.waitFor();
  const heroVideoState = await heroVideo.evaluate((node) => ({
    objectFit: getComputedStyle(node).objectFit,
    src: node.getAttribute("src") || "",
  }));
  assert.equal(heroVideoState.objectFit, "contain");
  assert.ok(heroVideoState.src.includes("kkudok-demo.mp4"), "Hero must use the real demo video");

  assert.equal(await page.locator("video").count(), 1, "landing must have one real video player");

  const videoUrl = new URL(heroVideoState.src, baseURL).toString();
  const videoResponse = await fetch(videoUrl);
  assert.equal(videoResponse.status, 200, "demo video request did not return 200");
  assert.ok(
    (videoResponse.headers.get("content-type") || "").includes("video/mp4"),
    "demo video did not return video/mp4"
  );
  const videoBytes = await videoResponse.arrayBuffer();
  assert.ok(videoBytes.byteLength > 1_000_000, "demo video payload is unexpectedly small");

  const heroQr = page.locator(".contest-hero-experience img");
  await heroQr.waitFor();
  const qrState = await heroQr.evaluate((node) => ({
    parentTag: node.parentElement?.tagName || "",
    src: node.getAttribute("src") || "",
    complete: node.complete,
    naturalWidth: node.naturalWidth,
  }));
  assert.notEqual(qrState.parentTag, "A", "QR itself must not act as a desktop hyperlink");
  assert.ok(qrState.src.startsWith("data:image/png;base64,"), "QR must encode the current deployment URL");
  assert.equal(qrState.complete, true);
  assert.ok(qrState.naturalWidth > 0, "contest QR failed to render");
  const browserCta = page.locator('a[href="/#/contest"]').filter({ hasText: "이 기기에서 바로 체험하기" }).first();
  await browserCta.waitFor();

  await assertNoHorizontalOverflow(page, label);
}

async function enterContest(page) {
  await page.evaluate(() => {
    localStorage.setItem(
      "submate-mvp:profile",
      JSON.stringify({ nickname: "기존 사용자", provider: "Local", guest: false })
    );
    localStorage.setItem(
      "submate-mvp:subscriptions",
      JSON.stringify([{ id: "private-existing-sub", name: "기존 사용자 구독", amount: 12345 }])
    );
  });

  await page.locator('a[href="/#/contest"]').filter({ hasText: "이 기기에서 바로 체험하기" }).first().click();
  await page.waitForURL(/#\/contest$/);
  await page.getByRole("heading", { name: "꾸독을 직접 경험해보세요." }).waitFor();
  await page.getByText("꾸독 컨시어지", { exact: true }).waitFor();

  const preserved = await page.evaluate(() => ({
    profile: JSON.parse(localStorage.getItem("submate-mvp:profile") || "null"),
    subscriptions: JSON.parse(localStorage.getItem("submate-mvp:subscriptions") || "null"),
  }));
  assert.equal(preserved.profile?.nickname, "기존 사용자");
  assert.equal(preserved.profile?.provider, "Local");
  assert.equal(preserved.subscriptions?.[0]?.id, "private-existing-sub");
}

async function runScenarioA(page) {
  await page.locator(".contest-scenario-picker button").filter({ hasText: "체험 A · 새 결제" }).click();
  await page.getByRole("heading", { name: "새로운 결제가 발생한 상황" }).waitFor();

  await page.locator('[data-contest-target="contest-a-start"]').click();
  const headsUp = page.locator('[data-contest-target="contest-payment-headsup"]');
  await headsUp.waitFor();

  let flow = await readContestFlow(page);
  assert.equal(flow?.step, "A2");
  assert.equal(flow?.parsedPayment?.serviceId, "netflix");
  assert.equal(flow?.parsedPayment?.amount, 17000);
  assert.equal(flow?.parsedPayment?.paymentMethod, "신한카드");

  await headsUp.locator("button.contest-headsup-body").click();
  await page.getByRole("heading", { name: "구독 정보 확인" }).waitFor();
  await page.getByText("Netflix", { exact: true }).first().waitFor();

  flow = await readContestFlow(page);
  assert.equal(flow?.step, "A3");

  await page.locator(".contest-guide-panel").getByRole("button", { name: "등록 단계로" }).click();
  flow = await readContestFlow(page);
  assert.equal(flow?.step, "A4");

  const addButton = page.locator('[data-contest-target="contest-add-save"]');
  await addButton.waitFor();
  assert.equal(await addButton.isEnabled(), true);
  await addButton.click();
  await page.getByRole("heading", { name: "구독 정보 확인" }).waitFor({ state: "hidden" });

  await page.waitForURL(/#\/home$/);
  flow = await readContestFlow(page);
  assert.equal(flow?.step, "A5");
  assert.ok(flow?.addedSubscriptionId, "Scenario A must store the actually created subscription id");

  await page.locator('[data-contest-target="nav-promotions"]').click();
  await page.waitForURL(/#\/promotions$/);
  await page.getByText("등록한 Netflix 기준으로 확인할 수 있는 혜택이에요.", { exact: true }).waitFor();
  await page.getByText("네이버플러스 X Netflix", { exact: true }).first().waitFor();
  await page.getByText("적용 조건", { exact: true }).first().waitFor();
  await page.getByText("혜택 기간", { exact: true }).first().waitFor();
  await page.getByText("공식 안내 링크 제공", { exact: true }).first().waitFor();
  await page.getByText(/help\.naver\.com/).waitFor();

  flow = await readContestFlow(page);
  assert.equal(flow?.step, "A6");

  const sourceButton = page.locator('[data-contest-target="contest-benefit-source"]');
  const popupPromise = page.waitForEvent("popup", { timeout: 5000 }).catch(() => null);
  await sourceButton.click();
  const popup = await popupPromise;
  if (popup) await popup.close();

  flow = await readContestFlow(page);
  assert.equal(flow?.step, "A7");

  await page.locator('[data-contest-target="notification-center-button"]').click();
  flow = await readContestFlow(page);
  assert.equal(flow?.step, "A8");

  const reminderButton = page.locator('[data-contest-target="contest-reminder-test"]');
  await reminderButton.waitFor();
  await reminderButton.click();

  flow = await readContestFlow(page);
  assert.equal(flow?.step, "A9");
  await page.getByText("체험 A · 완료", { exact: true }).waitFor();

  await page.screenshot({ path: "artifacts/contest/scenario-a-complete.png", fullPage: true });
}

async function resetToContestPicker(page) {
  const resetLink = page.getByRole("link", { name: "다른 시나리오 체험하기" });
  await resetLink.waitFor();
  await resetLink.click();
  await page.waitForURL(/#\/contest$/);
  await page.getByRole("heading", { name: "꾸독을 직접 경험해보세요." }).waitFor();
}

async function runScenarioB(page) {
  await page.locator(".contest-scenario-picker button").filter({ hasText: "체험 B · 지난 결제" }).click();
  await page.getByRole("heading", { name: "놓친 결제를 다시 불러오는 상황" }).waitFor();

  const sampleLink = page.locator('[data-contest-target="contest-b-sample"]');
  const downloadPromise = page.waitForEvent("download");
  await sampleLink.click();
  const download = await downloadPromise;
  const downloadedPath = await download.path();
  assert.ok(downloadedPath && fs.existsSync(downloadedPath), "sample receipt download did not produce a file");
  assert.ok(fs.statSync(downloadedPath).size > 0, "sample receipt download is empty");

  let flow = await readContestFlow(page);
  assert.equal(flow?.step, "B2");

  await page.locator('[data-contest-target="contest-b-upload-start"]').click();
  await page.getByRole("heading", { name: "구독 추가하기" }).waitFor();
  flow = await readContestFlow(page);
  assert.equal(flow?.step, "B3");

  const uploadButton = page.locator('[data-contest-target="contest-image-upload"]');
  await uploadButton.waitFor();

  if (!verifyRealOcr) {
    return;
  }

  const input = page.locator('input[type="file"][accept*="image/png"]').first();
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/ocr") && response.request().method() === "POST",
    { timeout: 60000 }
  );
  await input.setInputFiles(path.join(process.cwd(), "public", "sample_receipt_netflix.png"));
  const ocrResponse = await responsePromise;
  assert.equal(ocrResponse.status(), 200, "real /api/ocr request must succeed on Vercel preview");
  const ocrPayload = await ocrResponse.json();
  assert.equal(ocrPayload?.ok, true);
  assert.equal(ocrPayload?.data?.name, "Netflix");
  assert.ok(Number(ocrPayload?.data?.amount) > 0);

  await page.getByRole("heading", { name: "구독 정보 확인" }).waitFor({ timeout: 60000 });
  await page.getByText("Netflix", { exact: true }).first().waitFor();

  flow = await readContestFlow(page);
  assert.equal(flow?.step, "B4");
  assert.equal(flow?.ocrResult?.name, "Netflix");

  await page.locator(".contest-guide-panel").getByRole("button", { name: "등록 단계로" }).click();
  flow = await readContestFlow(page);
  assert.equal(flow?.step, "B5");

  const addButton = page.locator('[data-contest-target="contest-add-save"]');
  await addButton.waitFor();
  assert.equal(await addButton.isEnabled(), true);
  await addButton.click();

  await page.waitForURL(/#\/home$/);
  flow = await readContestFlow(page);
  assert.equal(flow?.step, "B6");

  await page.locator('[data-contest-target="nav-subscriptions"]').click();
  await page.waitForURL(/#\/subscriptions$/);
  flow = await readContestFlow(page);
  assert.equal(flow?.step, "B7");

  await page.locator('[data-contest-target="subscription-seed-naverplus"]').click();
  await page.waitForURL(/#\/detail\/seed-naverplus$/);
  await page.getByText("네이버플러스 멤버십", { exact: true }).first().waitFor();
  flow = await readContestFlow(page);
  assert.equal(flow?.step, "B8");

  await page.locator('[data-contest-target="cancel-primary"]').click();
  await page.getByRole("dialog", { name: "구독 해지 가이드" }).waitFor();
  await page.locator('[data-contest-target="cancel-open-site"]').waitFor();
  flow = await readContestFlow(page);
  assert.equal(flow?.step, "B9");

  const cancelSite = page.locator('[data-contest-target="cancel-open-site"] button').first();
  await cancelSite.waitFor();
  const popupPromise = page.waitForEvent("popup", { timeout: 5000 }).catch(() => null);
  await cancelSite.click();
  const popup = await popupPromise;
  if (popup) await popup.close();

  flow = await readContestFlow(page);
  assert.equal(flow?.step, "B10");
  await page.getByText("웹에서는 별도 네이버 탭의 버튼 위치를 읽을 수 없어요.", { exact: false }).waitFor();
  await page.getByText("네이버 해지 화면 열기", { exact: true }).waitFor();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByText("2/2", { exact: true }).first().waitFor();
  await page.screenshot({ path: "artifacts/contest/scenario-b-naver-guide.png", fullPage: true });
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.locator(".sheet-backdrop").click({ position: { x: 2, y: 2 } });
  await page.getByText("체험 B · 완료", { exact: true }).waitFor();

  const preserved = await page.evaluate(() => ({
    profile: JSON.parse(localStorage.getItem("submate-mvp:profile") || "null"),
    subscriptions: JSON.parse(localStorage.getItem("submate-mvp:subscriptions") || "null"),
  }));
  assert.equal(preserved.profile?.nickname, "기존 사용자");
  assert.equal(preserved.subscriptions?.[0]?.id, "private-existing-sub");

  await page.screenshot({ path: "artifacts/contest/scenario-b-complete.png", fullPage: true });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 1920]) {
      const page = await browser.newPage({ viewport: { width, height: 1080 } });
      await verifyLanding(page, `desktop ${width}`);
      if (width === 1440) {
        await page.screenshot({ path: "artifacts/contest/landing-desktop-1440.png", fullPage: true });
      }
      if (width === 1920) {
        await page.screenshot({ path: "artifacts/contest/landing-desktop-1920.png", fullPage: true });
      }
      await page.close();
    }

    for (const width of [390, 360, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await verifyLanding(page, `mobile ${width}`);
      if (width === 390) {
        await page.screenshot({ path: "artifacts/contest/landing-mobile-390.png", fullPage: true });
      }
      await page.close();
    }

    const flowPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await verifyLanding(flowPage, "scenario mobile");
    await enterContest(flowPage);
    await runScenarioA(flowPage);
    await resetToContestPicker(flowPage);
    await runScenarioB(flowPage);

    await assertNoHorizontalOverflow(flowPage, "contest mobile flow");

    console.log(
      verifyRealOcr
        ? "Contest landing, Scenario A, and real OCR Scenario B checks passed."
        : "Contest landing and Scenario A checks passed; real OCR is reserved for Vercel preview."
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
