import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  LoaderCircle,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/app/components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/Card";
import { Input } from "@/app/components/Input";
import { PageHelpButton } from "@/components/PageHelpButton";
import {
  createUserGroup,
  deleteUserGroup,
  loadUserGroups,
  normalizeMemberIds,
  resolveGroupMembers,
  updateUserGroup,
} from "@/lib/user-groups";
import { fetchAllUsers, filterUsers, getUserId } from "@/lib/users";
import type { AppUser, UserGroup } from "@/types/api";

const VIEW_PAGE_SIZE = 40;

export function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  const [usersLoading, setUsersLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [refreshingUsers, setRefreshingUsers] = useState(false);
  const [groupBusy, setGroupBusy] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [groupsError, setGroupsError] = useState("");

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [editingGroupName, setEditingGroupName] = useState("");
  const [editingGroupDescription, setEditingGroupDescription] = useState("");

  const loadUsers = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) {
      setRefreshingUsers(true);
    } else {
      setUsersLoading(true);
    }

    try {
      const fetchedUsers = await fetchAllUsers();
      setUsers(fetchedUsers);
      setUsersError("");

      const validIds = new Set(fetchedUsers.map((user) => getUserId(user)));
      setSelectedUserIds((current) => current.filter((memberId) => validIds.has(memberId)));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load users";
      setUsersError(message);
      toast.error(message);
    } finally {
      setUsersLoading(false);
      setRefreshingUsers(false);
    }
  }, []);

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true);

    try {
      const fetchedGroups = await loadUserGroups();
      setGroups(fetchedGroups);
      setGroupsError("");
      setActiveGroupId((current) => {
        if (current && fetchedGroups.some((group) => group.id === current)) {
          return current;
        }

        return fetchedGroups[0]?.id ?? null;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load groups";
      setGroupsError(message);
      toast.error(message);
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers(false);
    void loadGroups();
  }, [loadGroups, loadUsers]);

  const filteredUsers = useMemo(
    () => filterUsers(users, searchQuery),
    [users, searchQuery],
  );

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / VIEW_PAGE_SIZE));
  useEffect(() => {
    setCurrentPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const visibleUsers = useMemo(() => {
    const start = (currentPage - 1) * VIEW_PAGE_SIZE;
    return filteredUsers.slice(start, start + VIEW_PAGE_SIZE);
  }, [currentPage, filteredUsers]);

  const selectedIdSet = useMemo(() => new Set(selectedUserIds), [selectedUserIds]);
  const visibleUserIds = useMemo(() => visibleUsers.map((user) => getUserId(user)), [visibleUsers]);
  const allVisibleSelected =
    visibleUserIds.length > 0 &&
    visibleUserIds.every((memberId) => selectedIdSet.has(memberId));

  const activeGroup = useMemo(
    () => groups.find((group) => group.id === activeGroupId) ?? null,
    [activeGroupId, groups],
  );

  useEffect(() => {
    setEditingGroupName(activeGroup?.name ?? "");
    setEditingGroupDescription(activeGroup?.description ?? "");
  }, [activeGroup]);

  const activeGroupMembers = useMemo(
    () => resolveGroupMembers(activeGroup, users),
    [activeGroup, users],
  );

  const unresolvedMemberCount = activeGroup
    ? Math.max(0, activeGroup.memberIds.length - activeGroupMembers.length)
    : 0;

  const toggleUserSelection = (memberId: string) => {
    setSelectedUserIds((current) => {
      if (current.includes(memberId)) {
        return current.filter((id) => id !== memberId);
      }

      return [...current, memberId];
    });
  };

  const handleSelectAllVisible = () => {
    setSelectedUserIds((current) => {
      const currentSet = new Set(current);
      if (allVisibleSelected) {
        return current.filter((memberId) => !visibleUserIds.includes(memberId));
      }

      for (const memberId of visibleUserIds) {
        currentSet.add(memberId);
      }

      return Array.from(currentSet);
    });
  };

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) {
      toast.error("Group name is required.");
      return;
    }

    setGroupBusy(true);
    try {
      const result = await createUserGroup({
        name,
        description: newGroupDescription.trim() || undefined,
        memberIds: selectedUserIds,
      });
      setGroups(result.groups);
      setActiveGroupId(result.createdGroupId);
      setNewGroupName("");
      setNewGroupDescription("");
      toast.success("Group created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create group");
    } finally {
      setGroupBusy(false);
    }
  };

  const handleSaveGroupDetails = async () => {
    if (!activeGroup) {
      toast.error("Select a group first.");
      return;
    }

    const name = editingGroupName.trim();
    if (!name) {
      toast.error("Group name is required.");
      return;
    }

    setGroupBusy(true);
    try {
      const nextGroups = await updateUserGroup(activeGroup.id, {
        name,
        description: editingGroupDescription.trim() || null,
      });
      setGroups(nextGroups);
      toast.success("Group details updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update group");
    } finally {
      setGroupBusy(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!activeGroup) {
      return;
    }

    if (!window.confirm(`Delete group "${activeGroup.name}"?`)) {
      return;
    }

    setGroupBusy(true);
    try {
      const nextGroups = await deleteUserGroup(activeGroup.id);
      setGroups(nextGroups);
      setActiveGroupId(nextGroups[0]?.id ?? null);
      toast.success("Group deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete group");
    } finally {
      setGroupBusy(false);
    }
  };

  const updateActiveGroupMembers = async (memberIds: string[], successMessage: string) => {
    if (!activeGroup) {
      toast.error("Select a group first.");
      return;
    }

    setGroupBusy(true);
    try {
      const nextGroups = await updateUserGroup(activeGroup.id, {
        memberIds: normalizeMemberIds(memberIds),
      });
      setGroups(nextGroups);
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update group members");
    } finally {
      setGroupBusy(false);
    }
  };

  const handleAddSelectedToGroup = async () => {
    if (!activeGroup) {
      toast.error("Select a group first.");
      return;
    }

    if (selectedUserIds.length === 0) {
      toast.error("Select at least one user from the list.");
      return;
    }

    await updateActiveGroupMembers(
      [...activeGroup.memberIds, ...selectedUserIds],
      "Selected users added to group.",
    );
  };

  const handleRemoveSelectedFromGroup = async () => {
    if (!activeGroup) {
      toast.error("Select a group first.");
      return;
    }

    if (selectedUserIds.length === 0) {
      toast.error("Select at least one user from the list.");
      return;
    }

    const selectedSet = new Set(selectedUserIds);
    await updateActiveGroupMembers(
      activeGroup.memberIds.filter((memberId) => !selectedSet.has(memberId)),
      "Selected users removed from group.",
    );
  };

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-2 text-3xl font-semibold text-[var(--clockwork-green)]">Users</h1>
          <p className="text-sm text-[var(--clockwork-gray-600)]">
            Load users from the connected OrangeHRM database and manage reusable groups.
          </p>
        </div>
        <PageHelpButton
          title="Users Help"
          overview="Use this page to browse users, select them, and maintain reusable groups."
          steps={[
            "Refresh users from the database and search by name, username, email, or employee ID.",
            "Select users from the current visible list using row checkboxes or Select All Visible.",
            "Create, update, and manage groups on the right panel.",
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
        <Card className="min-w-0">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Users List</CardTitle>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void loadUsers(true)}
                disabled={usersLoading || refreshingUsers}
              >
                {refreshingUsers ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Refresh Users
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Search"
              placeholder="Search username, full name, email, or employee ID"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setCurrentPage(1);
              }}
            />

            {usersError ? (
              <div className="flex items-start gap-2 rounded-lg border border-[var(--clockwork-error)]/40 bg-red-50 p-3 text-sm text-[var(--clockwork-error)] dark:bg-red-950/20">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <p>{usersError}</p>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[var(--clockwork-gray-600)]">
                {filteredUsers.length} visible of {users.length} users | Selected:{" "}
                <span className="font-semibold text-[var(--clockwork-gray-900)]">
                  {selectedUserIds.length}
                </span>
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleSelectAllVisible}
                  disabled={visibleUserIds.length === 0}
                >
                  {allVisibleSelected ? "Unselect Visible" : "Select All Visible"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedUserIds([])}
                  disabled={selectedUserIds.length === 0}
                >
                  Clear Selection
                </Button>
              </div>
            </div>

            {usersLoading && users.length === 0 ? (
              <div className="space-y-2 rounded-lg border border-[var(--clockwork-border)] p-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={`users-skeleton-${index}`}
                    className="h-8 animate-pulse rounded bg-[var(--clockwork-gray-100)]"
                  />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="rounded-lg border border-[var(--clockwork-border)] p-8 text-center text-sm text-[var(--clockwork-gray-500)]">
                No users found.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[var(--clockwork-border)]">
                <table className="w-full border-collapse">
                  <thead className="bg-[var(--clockwork-orange)] text-white">
                    <tr>
                      <th className="w-12 px-3 py-3 text-left text-xs font-semibold">#</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold">Full Name</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold">Username</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold">Email</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold">Employee ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleUsers.map((user) => {
                      const memberId = getUserId(user);
                      const checked = selectedIdSet.has(memberId);
                      return (
                        <tr
                          key={memberId}
                          className="border-t border-[var(--clockwork-border)] hover:bg-[var(--clockwork-gray-50)]"
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleUserSelection(memberId)}
                              className="h-4 w-4 accent-[var(--clockwork-orange)]"
                            />
                          </td>
                          <td className="px-3 py-2 text-sm text-[var(--clockwork-gray-900)]">
                            {user.fullName}
                          </td>
                          <td className="px-3 py-2 text-sm text-[var(--clockwork-gray-700)]">
                            {user.username}
                          </td>
                          <td className="px-3 py-2 text-sm text-[var(--clockwork-gray-700)]">
                            {user.email ?? "-"}
                          </td>
                          <td className="px-3 py-2 text-sm text-[var(--clockwork-gray-700)]">
                            {user.employeeId ?? "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--clockwork-gray-500)]">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
                  disabled={currentPage <= 1}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Groups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {groupsError ? (
              <div className="flex items-start gap-2 rounded-lg border border-[var(--clockwork-error)]/40 bg-red-50 p-3 text-sm text-[var(--clockwork-error)] dark:bg-red-950/20">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <p>{groupsError}</p>
              </div>
            ) : null}

            <div className="rounded-lg border border-[var(--clockwork-border)] p-3">
              <p className="mb-2 text-sm font-medium text-[var(--clockwork-gray-900)]">
                Create Group
              </p>
              <div className="space-y-2">
                <Input
                  placeholder="Group name"
                  value={newGroupName}
                  onChange={(event) => setNewGroupName(event.target.value)}
                />
                <Input
                  placeholder="Description (optional)"
                  value={newGroupDescription}
                  onChange={(event) => setNewGroupDescription(event.target.value)}
                />
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => void handleCreateGroup()}
                  disabled={groupBusy}
                >
                  <Plus className="h-4 w-4" />
                  Create Group
                </Button>
              </div>
            </div>

            {groupsLoading && groups.length === 0 ? (
              <div className="space-y-2 rounded-lg border border-[var(--clockwork-border)] p-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`groups-skeleton-${index}`}
                    className="h-8 animate-pulse rounded bg-[var(--clockwork-gray-100)]"
                  />
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="rounded-lg border border-[var(--clockwork-border)] p-6 text-center text-sm text-[var(--clockwork-gray-500)]">
                No groups yet.
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map((group) => (
                  <button
                    type="button"
                    key={group.id}
                    onClick={() => setActiveGroupId(group.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                      activeGroupId === group.id
                        ? "border-[var(--clockwork-orange)] bg-[var(--clockwork-orange-light)]"
                        : "border-[var(--clockwork-border)] hover:bg-[var(--clockwork-gray-50)]"
                    }`}
                  >
                    <p className="font-medium text-[var(--clockwork-gray-900)]">{group.name}</p>
                    <p className="text-xs text-[var(--clockwork-gray-600)]">
                      {group.memberIds.length} member(s)
                    </p>
                  </button>
                ))}
              </div>
            )}

            {activeGroup ? (
              <div className="space-y-3 rounded-lg border border-[var(--clockwork-border)] p-3">
                <p className="text-sm font-medium text-[var(--clockwork-gray-900)]">
                  Group Details
                </p>

                <Input
                  label="Name"
                  value={editingGroupName}
                  onChange={(event) => setEditingGroupName(event.target.value)}
                />
                <Input
                  label="Description"
                  value={editingGroupDescription}
                  onChange={(event) => setEditingGroupDescription(event.target.value)}
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void handleSaveGroupDetails()}
                    disabled={groupBusy}
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void handleAddSelectedToGroup()}
                    disabled={groupBusy}
                  >
                    <UserPlus className="h-4 w-4" />
                    Add Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void handleRemoveSelectedFromGroup()}
                    disabled={groupBusy}
                  >
                    <UserMinus className="h-4 w-4" />
                    Remove Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => void handleDeleteGroup()}
                    disabled={groupBusy}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>

                <div className="rounded-lg border border-[var(--clockwork-border)] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--clockwork-gray-900)]">
                      Members ({activeGroup.memberIds.length})
                    </p>
                    {unresolvedMemberCount > 0 ? (
                      <p className="text-xs text-[var(--clockwork-warning)]">
                        {unresolvedMemberCount} member(s) not found in current DB results
                      </p>
                    ) : null}
                  </div>

                  {activeGroup.memberIds.length === 0 ? (
                    <p className="text-sm text-[var(--clockwork-gray-500)]">No members in this group.</p>
                  ) : (
                    <div className="space-y-2">
                      {activeGroup.memberIds.map((memberId) => {
                        const memberUser = activeGroupMembers.find(
                          (user) => getUserId(user) === memberId,
                        );

                        return (
                          <div
                            key={memberId}
                            className="flex items-center justify-between rounded border border-[var(--clockwork-border)] px-2 py-1.5"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm text-[var(--clockwork-gray-900)]">
                                {memberUser ? memberUser.fullName : memberId}
                              </p>
                              <p className="truncate text-xs text-[var(--clockwork-gray-500)]">
                                {memberUser ? memberUser.username : "Missing user"}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                void updateActiveGroupMembers(
                                  activeGroup.memberIds.filter((id) => id !== memberId),
                                  "Member removed from group.",
                                )
                              }
                              className="rounded p-1 text-[var(--clockwork-error)] hover:bg-red-50"
                              title="Remove member"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="border-[var(--clockwork-border)] bg-[var(--clockwork-gray-50)]">
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-[var(--clockwork-gray-700)]">
            <Users className="h-4 w-4 text-[var(--clockwork-green)]" />
            Groups are stored locally on this machine and keep only user identifiers.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
