import bcrypt from "bcrypt";
import { Request, Response, NextFunction } from "express";
import { getPrisma } from "./prisma.js";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Login required" } });
  }
  const user = await getPrisma().user.findFirst({ where: { id: userId, isActive: true } });
  if (!user) {
    return res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Login required" } });
  }
  (req as Request & { currentUser: typeof user }).currentUser = user;
  next();
}

export function requirePasswordAlreadySet(req: Request, res: Response, next: NextFunction) {
  const user = (req as Request & { currentUser: { mustChangePassword: boolean } }).currentUser;
  if (user.mustChangePassword) {
    return res.status(403).json({
      error: { code: "PASSWORD_CHANGE_REQUIRED", message: "You must change your password before continuing" },
    });
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as Request & { currentUser: { role: string } }).currentUser;
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Not permitted for your role" } });
    }
    next();
  };
}