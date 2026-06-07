import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

interface JwtPayload {
  sub: string;
  preferred_username: string;
  [key: string]: unknown;
}

function decodeJwtPayload(authHeader: string | undefined): JwtPayload | null {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8")) as JwtPayload;
  } catch {
    return null;
  }
}

export const PlayerId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<Request>();
  return decodeJwtPayload(req.headers.authorization)?.sub ?? "";
});

export const Username = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<Request>();
  return decodeJwtPayload(req.headers.authorization)?.preferred_username ?? "";
});
