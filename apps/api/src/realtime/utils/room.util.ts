export function buildListRoom(listId: string): string {
  return `list:${listId}`;
}

export function buildUserRoom(userId: string): string {
  return `user:${userId}`;
}
