export function sameBusiness(
  userBusinessId: string,
  resourceBusinessId: string,
): boolean {
  return Boolean(userBusinessId) && userBusinessId === resourceBusinessId;
}

export function canAccessConversation(input: {
  userId: string;
  userBusinessId: string;
  conversationUserId: string;
  conversationBusinessId: string;
}): boolean {
  return (
    input.userId === input.conversationUserId &&
    sameBusiness(input.userBusinessId, input.conversationBusinessId)
  );
}

export function canBindConversationProject(input: {
  userBusinessId: string;
  projectBusinessId: string;
}): boolean {
  return sameBusiness(input.userBusinessId, input.projectBusinessId);
}

export function denyCrossBusinessAccess(): string {
  return "I can only access projects available to your BuildPilot account.";
}
