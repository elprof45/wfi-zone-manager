// lib/db/queries/users.ts
// Drizzle queries — Users domain

import { eq, desc, ne } from 'drizzle-orm';
import { db } from '../index';
import { users } from '../schema';

export type UserRole = 'super_admin' | 'admin' | 'cashier';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  banned: boolean;
  banReason: string | null;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Get all users, excluding password info (Better-Auth stores passwords in accounts table) */
export async function getAllUsers(): Promise<UserRecord[]> {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      banned: users.banned,
      banReason: users.banReason,
      emailVerified: users.emailVerified,
      image: users.image,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt)) as Promise<UserRecord[]>;
}

export async function getUserById(id: string): Promise<UserRecord | undefined> {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      banned: users.banned,
      banReason: users.banReason,
      emailVerified: users.emailVerified,
      image: users.image,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return user as UserRecord | undefined;
}

export async function getUserByEmail(email: string): Promise<UserRecord | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return user as UserRecord | undefined;
}

export async function updateUser(
  id: string,
  data: Partial<{
    name: string;
    email: string;
    role: UserRole;
    banned: boolean;
    banReason: string | null;
    image: string | null;
  }>
): Promise<UserRecord | undefined> {
  const [updated] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return updated as UserRecord | undefined;
}

export async function deleteUser(id: string): Promise<boolean> {
  const result = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
  return result.length > 0;
}

export async function countUsers(): Promise<number> {
  const all = await db.select({ id: users.id }).from(users);
  return all.length;
}
