/** 项目导读：密码工具：只处理哈希与校验，不保存明文；密码不是榨菜，不能摊开给大家看。 */
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const keyLength = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, keyLength).toString("hex");

  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, salt, storedHash] = passwordHash.split("$");

  if (algorithm === "scrypt" && salt && storedHash) {
    const hash = scryptSync(password, salt, keyLength);
    const stored = Buffer.from(storedHash, "hex");
    return stored.length === hash.length && timingSafeEqual(stored, hash);
  }

  return false;
}
