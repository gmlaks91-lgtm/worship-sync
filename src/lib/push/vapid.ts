import "server-only";

import webpush from "web-push";

import {
  describeMissingVapidEnv,
  getVapidPrivateKeyFromEnv,
  getVapidPublicKeyFromEnv,
  getVapidSubjectFromEnv,
  normalizeVapidSubject,
} from "@/lib/push/vapid-env";

export type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

let configured = false;

export function getVapidConfig(): VapidConfig | null {
  const publicKey = getVapidPublicKeyFromEnv();
  const privateKey = getVapidPrivateKeyFromEnv();
  const subject = normalizeVapidSubject(getVapidSubjectFromEnv());

  if (!publicKey || !privateKey) {
    return null;
  }

  return { publicKey, privateKey, subject };
}

export function configureWebPush(): VapidConfig | null {
  const config = getVapidConfig();
  if (!config) return null;

  if (!configured) {
    webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
    configured = true;
  }

  return config;
}

export function getVapidPublicKey(): string | null {
  return getVapidPublicKeyFromEnv();
}

export function getVapidConfigError(): string {
  return describeMissingVapidEnv() ?? "VAPID 키가 설정되지 않았습니다.";
}

export { describeMissingVapidEnv };
