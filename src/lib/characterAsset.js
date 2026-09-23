export const DEFAULT_CHARACTER_SRC = "/assets/kkudok/kkudok_official.png";

function officialAsset(extra = {}) {
  return {
    ...extra,
    mode: "DEFAULT",
    hasCustom: false,
    src: DEFAULT_CHARACTER_SRC,
  };
}

export async function getCharacterAsset() {
  return officialAsset();
}

export async function pickCharacterPng() {
  return officialAsset({
    status: "DISABLED",
    message: "꾸독은 공식 캐릭터 이미지만 사용합니다.",
  });
}

export async function applyPendingCharacter() {
  return officialAsset({
    status: "DISABLED",
    message: "꾸독은 공식 캐릭터 이미지만 사용합니다.",
  });
}

export async function discardPendingCharacter() {
  return undefined;
}

export async function resetCharacterAsset() {
  return officialAsset({ status: "RESET" });
}
