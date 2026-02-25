import { apiClient } from "@/api/client";
import type { AppUser, UserGroup } from "@/types/api";

export interface UserGroupDraft {
  name: string;
  description?: string;
  memberIds?: string[];
}

export function toUserMemberId(user: AppUser): string {
  return String(user.id);
}

export function normalizeMemberIds(memberIds: string[]): string[] {
  return Array.from(new Set(memberIds.map((memberId) => memberId.trim()).filter(Boolean)));
}

export function sortUserGroups(groups: UserGroup[]): UserGroup[] {
  return [...groups].sort((left, right) => left.name.localeCompare(right.name));
}

export function resolveGroupMembers(group: UserGroup | null, users: AppUser[]): AppUser[] {
  if (!group) {
    return [];
  }

  const byId = new Map<string, AppUser>();
  for (const user of users) {
    byId.set(toUserMemberId(user), user);
  }

  return group.memberIds.map((memberId) => byId.get(memberId)).filter(Boolean) as AppUser[];
}

export function filterExistingMemberIds(memberIds: string[], users: AppUser[]): string[] {
  const validIds = new Set(users.map((user) => toUserMemberId(user)));
  return normalizeMemberIds(memberIds).filter((memberId) => validIds.has(memberId));
}

export async function loadUserGroups(): Promise<UserGroup[]> {
  const { groups } = await apiClient.getUserGroups();
  return sortUserGroups(groups);
}

export async function createUserGroup(draft: UserGroupDraft): Promise<{
  groups: UserGroup[];
  createdGroupId: string;
}> {
  const { groups, group } = await apiClient.createUserGroup({
    name: draft.name,
    description: draft.description,
    memberIds: normalizeMemberIds(draft.memberIds ?? []),
  });
  return {
    groups: sortUserGroups(groups),
    createdGroupId: group.id,
  };
}

export async function updateUserGroup(
  groupId: string,
  update: {
    name?: string;
    description?: string | null;
    memberIds?: string[];
  },
): Promise<UserGroup[]> {
  const payload: {
    name?: string;
    description?: string | null;
    memberIds?: string[];
  } = {};

  if (update.name !== undefined) {
    payload.name = update.name;
  }
  if (update.description !== undefined) {
    payload.description = update.description;
  }
  if (update.memberIds !== undefined) {
    payload.memberIds = normalizeMemberIds(update.memberIds);
  }

  const { groups } = await apiClient.updateUserGroup(groupId, payload);
  return sortUserGroups(groups);
}

export async function deleteUserGroup(groupId: string): Promise<UserGroup[]> {
  const { groups } = await apiClient.deleteUserGroup(groupId);
  return sortUserGroups(groups);
}
