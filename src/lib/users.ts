import { apiClient } from "@/api/client";
import type { AppUser } from "@/types/api";

const SERVER_PAGE_SIZE = 250;

export function getUserId(user: AppUser): string {
  return String(user.id);
}

export function sortUsers(users: AppUser[]): AppUser[] {
  return [...users].sort((left, right) => {
    const leftLabel = `${left.fullName} ${left.username}`.toLowerCase();
    const rightLabel = `${right.fullName} ${right.username}`.toLowerCase();
    return leftLabel.localeCompare(rightLabel);
  });
}

export function dedupeUsers(users: AppUser[]): AppUser[] {
  const map = new Map<string, AppUser>();
  for (const user of users) {
    map.set(getUserId(user), user);
  }

  return Array.from(map.values());
}

export function dedupeAndSortUsers(users: AppUser[]): AppUser[] {
  return sortUsers(dedupeUsers(users));
}

export function filterUsers(users: AppUser[], query: string): AppUser[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return users;
  }

  return users.filter((user) => {
    const username = user.username.toLowerCase();
    const fullName = user.fullName.toLowerCase();
    const email = user.email?.toLowerCase() ?? "";
    const employeeId = user.employeeId?.toLowerCase() ?? "";
    return (
      username.includes(normalizedQuery) ||
      fullName.includes(normalizedQuery) ||
      email.includes(normalizedQuery) ||
      employeeId.includes(normalizedQuery)
    );
  });
}

export async function fetchAllUsers(): Promise<AppUser[]> {
  const users: AppUser[] = [];
  let offset = 0;

  while (true) {
    const response = await apiClient.getUsers({
      limit: SERVER_PAGE_SIZE,
      offset,
    });
    users.push(...response.users);

    if (response.users.length < SERVER_PAGE_SIZE) {
      break;
    }

    offset += SERVER_PAGE_SIZE;
    if (offset > 100000) {
      break;
    }
  }

  return dedupeAndSortUsers(users);
}
