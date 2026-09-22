const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");

fs.mkdirSync("artifacts/contest", { recursive: true });

const baseURL = process.env.CONTEST_BASE_URL || "http://127.0.0.1:4173";

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

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await desktop.goto(baseURL, { waitUntil: "networkidle" });

    await desktop.getByRole("heading", {
      name: /결제는 AI로 읽고,\s*절약액은 검증해서 보여줍니다\./,
    }).waitFor();

    for (const text of [
      "AI 영수증 · 결제 문자 자동 파싱",
      "공식 출처 검증 제휴 절약 혜택",
      "선제적 결제 리마인더 & 간편 해지",
      "꾸독은 이렇게 작동합니다.",
      "구독을 발견하는 순간은 모두 같지 않습니다.",
      "결제 정보에서, 필요한 것만 읽습니다.",
      "이번에는 직접 경험해보세요.",
    ]) {
      await desktop.getByText(text, { exact: true }).first().waitFor();
    }

    const video = desktop.locator("video").first();
    await video.waitFor();
    const videoStyle = await video.evaluate((node) => ({
      objectFit: getComputedStyle(node).objectFit,
      src: node.querySelector("source")?.getAttribute("src") || "",
    }));
    assert.equal(videoStyle.objectFit, "contain");
    assert.ok(videoStyle.src.length > 0, "demo video source is missing");

    const contestHref = await desktop
      .getByRole("link", { name: "꾸독 체험 시작하기" })
      .getAttribute("href");
    assert.equal(contestHref, "/#/contest");

    await desktop.evaluate(() => {
      localStorage.setItem(
        "submate-mvp:profile",
        JSON.stringify({ nickname: "기존 사용자", provider: "Local", guest: false })
      );
    });

    await assertNoHorizontalOverflow(desktop, "desktop 1440");
    await desktop.screenshot({ path: "artifacts/contest/landing-desktop-1440.png", fullPage: true });

    await desktop.getByRole("link", { name: "꾸독 체험 시작하기" }).click();
    await desktop.waitForURL(/#\/contest$/);
    await desktop.getByRole("heading", { name: "꾸독 공모전 체험" }).waitFor();
    await desktop.getByText("꾸독 컨시어지", { exact: true }).waitFor();
    const preservedProfile = await desktop.evaluate(() =>
      JSON.parse(localStorage.getItem("submate-mvp:profile") || "null")
    );
    assert.equal(preservedProfile?.nickname, "기존 사용자");
    assert.equal(preservedProfile?.provider, "Local");
    await desktop.screenshot({ path: "artifacts/contest/contest-experience.png", fullPage: true });

    await desktop.getByRole("button", { name: "테스트 결제 알림 보내기" }).click();
    await desktop.getByRole("heading", { name: "구독 정보 확인" }).waitFor();
    await desktop.getByText("Netflix", { exact: true }).first().waitFor();
    await desktop.getByRole("button", { name: "닫기", exact: true }).click();

    await desktop.getByRole("button", { name: "AI 캡처 등록 시작" }).click();
    await desktop.getByRole("heading", { name: "구독 추가하기" }).waitFor();
    await desktop.getByText("결제 내역을 불러오면", { exact: false }).waitFor();
    await desktop.getByRole("button", { name: "닫기", exact: true }).click();

    await desktop.getByRole("button", { name: "해지 가이드 체험" }).click();
    await desktop.waitForURL(/#\/detail\/seed-spotify\?highlight=cancel$/);
    await desktop.getByText("Spotify", { exact: true }).first().waitFor();

    for (const width of [390, 360, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(baseURL, { waitUntil: "networkidle" });
      await page.getByRole("heading", {
        name: /결제는 AI로 읽고,\s*절약액은 검증해서 보여줍니다\./,
      }).waitFor();
      await assertNoHorizontalOverflow(page, `mobile ${width}`);
      if (width === 390) {
        await page.screenshot({ path: "artifacts/contest/landing-mobile-390.png", fullPage: true });
      }
      await page.close();
    }

    console.log("Contest landing browser smoke checks passed.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
