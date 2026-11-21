import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcryptjs';

export async function hashPassword(password: string) { return bcrypt.hash(password, 12); }
export async function verifyPassword(password: string, encoded: string) { return bcrypt.compare(password, encoded); }
export function createOpaqueToken() { return randomBytes(48).toString('base64url'); }
export function hashOpaqueToken(token: string) { return createHash('sha256').update(token).digest('hex'); }
