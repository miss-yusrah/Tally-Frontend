import { isDynamoConfigured } from "@/lib/dynamo-config";
import type {
  AuthProvider,
  CreateUserInput,
  UpdateUserInput,
  UserRecord,
} from "@/types/user";
import { generateId } from "@/lib/utils";

const memoryUsers = new Map<string, UserRecord>();
const memoryEmailIndex = new Map<string, string>();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function userPk(id: string) {
  return `USER#${id}`;
}

function emailPk(email: string) {
  return `EMAIL#${normalizeEmail(email)}`;
}

async function loadDynamo() {
  const [{ docClient, TABLE_NAME }, commands] = await Promise.all([
    import("@/lib/dynamodb"),
    import("@aws-sdk/lib-dynamodb"),
  ]);
  return { docClient, TABLE_NAME, ...commands };
}

function toUserRecord(item: Record<string, unknown>): UserRecord {
  return {
    id: item.id as string,
    email: item.email as string,
    displayName: (item.displayName as string) ?? "",
    homeCurrency: (item.homeCurrency as string) ?? "USD",
    avatarUrl: item.avatarUrl as string | undefined,
    passwordHash: item.passwordHash as string | undefined,
    providers: (item.providers as AuthProvider[]) ?? [],
    onboardingComplete: Boolean(item.onboardingComplete),
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}

async function memoryFindByEmail(email: string): Promise<UserRecord | null> {
  const id = memoryEmailIndex.get(normalizeEmail(email));
  if (!id) return null;
  return memoryUsers.get(id) ?? null;
}

async function memoryFindById(id: string): Promise<UserRecord | null> {
  return memoryUsers.get(id) ?? null;
}

async function memoryCreate(input: CreateUserInput): Promise<UserRecord> {
  const now = new Date().toISOString();
  const id = generateId();
  const user: UserRecord = {
    id,
    email: normalizeEmail(input.email),
    displayName: input.displayName ?? "",
    homeCurrency: input.homeCurrency ?? "USD",
    avatarUrl: input.avatarUrl,
    passwordHash: input.passwordHash,
    providers: input.providers,
    onboardingComplete: input.onboardingComplete ?? false,
    createdAt: now,
    updatedAt: now,
  };
  memoryUsers.set(id, user);
  memoryEmailIndex.set(user.email, id);
  return user;
}

async function memoryUpdate(
  id: string,
  patch: UpdateUserInput
): Promise<UserRecord> {
  const existing = memoryUsers.get(id);
  if (!existing) throw new Error("User not found");
  const updated: UserRecord = {
    ...existing,
    ...patch,
    providers: patch.providers ?? existing.providers,
    updatedAt: new Date().toISOString(),
  };
  memoryUsers.set(id, updated);
  return updated;
}

export async function findUserByEmail(
  email: string
): Promise<UserRecord | null> {
  const normalized = normalizeEmail(email);

  if (!isDynamoConfigured()) {
    return memoryFindByEmail(normalized);
  }

  const { docClient, TABLE_NAME, GetCommand } = await loadDynamo();
  const emailLookup = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: emailPk(normalized), SK: "META" },
    })
  );

  if (!emailLookup.Item?.userId) return null;

  return findUserById(emailLookup.Item.userId as string);
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  if (!isDynamoConfigured()) {
    return memoryFindById(id);
  }

  const { docClient, TABLE_NAME, GetCommand } = await loadDynamo();
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: userPk(id), SK: "META" },
    })
  );

  if (!result.Item) return null;
  return toUserRecord(result.Item);
}

export async function createUser(input: CreateUserInput): Promise<UserRecord> {
  const email = normalizeEmail(input.email);
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new Error("USER_EXISTS");
  }

  if (!isDynamoConfigured()) {
    return memoryCreate({ ...input, email });
  }

  const now = new Date().toISOString();
  const id = generateId();
  const user: UserRecord = {
    id,
    email,
    displayName: input.displayName ?? "",
    homeCurrency: input.homeCurrency ?? "USD",
    avatarUrl: input.avatarUrl,
    passwordHash: input.passwordHash,
    providers: input.providers,
    onboardingComplete: input.onboardingComplete ?? false,
    createdAt: now,
    updatedAt: now,
  };

  const { docClient, TABLE_NAME, PutCommand } = await loadDynamo();
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: userPk(id),
        SK: "META",
        entityType: "USER",
        ...user,
      },
      ConditionExpression: "attribute_not_exists(PK)",
    })
  );

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: emailPk(email),
        SK: "META",
        entityType: "EMAIL_INDEX",
        userId: id,
        email,
      },
      ConditionExpression: "attribute_not_exists(PK)",
    })
  );

  return user;
}

export async function updateUser(
  id: string,
  patch: UpdateUserInput
): Promise<UserRecord> {
  if (!isDynamoConfigured()) {
    return memoryUpdate(id, patch);
  }

  const expressions: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  Object.entries(patch).forEach(([key, value], index) => {
    if (value === undefined) return;
    const nameKey = `#k${index}`;
    const valueKey = `:v${index}`;
    names[nameKey] = key;
    values[valueKey] = value;
    expressions.push(`${nameKey} = ${valueKey}`);
  });

  expressions.push("#updatedAt = :updatedAt");
  names["#updatedAt"] = "updatedAt";
  values[":updatedAt"] = new Date().toISOString();

  const { docClient, TABLE_NAME, UpdateCommand } = await loadDynamo();
  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: userPk(id), SK: "META" },
      UpdateExpression: `SET ${expressions.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW",
    })
  );

  return toUserRecord(result.Attributes!);
}

export async function linkProvider(
  userId: string,
  provider: AuthProvider
): Promise<UserRecord> {
  const user = await findUserById(userId);
  if (!user) throw new Error("User not found");

  if (user.providers.includes(provider)) {
    return user;
  }

  return updateUser(userId, {
    providers: [...user.providers, provider],
  });
}

export async function findOrCreateOAuthUser(params: {
  email: string;
  name?: string | null;
  image?: string | null;
  provider: AuthProvider;
}): Promise<UserRecord> {
  const existing = await findUserByEmail(params.email);

  if (existing) {
    const updates: UpdateUserInput = {};
    const providers = existing.providers.includes(params.provider)
      ? existing.providers
      : [...existing.providers, params.provider];

    if (!existing.providers.includes(params.provider)) {
      updates.providers = providers;
    }
    if (params.image && !existing.avatarUrl) {
      updates.avatarUrl = params.image;
    }
    if (params.name && !existing.displayName) {
      updates.displayName = params.name;
    }

    if (Object.keys(updates).length > 0) {
      return updateUser(existing.id, updates);
    }
    return existing;
  }

  return createUser({
    email: params.email,
    displayName: params.name ?? "",
    avatarUrl: params.image ?? undefined,
    providers: [params.provider],
    onboardingComplete: false,
  });
}

export async function setUserPassword(
  userId: string,
  passwordHash: string
): Promise<UserRecord> {
  const user = await findUserById(userId);
  if (!user) throw new Error("User not found");

  const providers: AuthProvider[] = user.providers.includes("credentials")
    ? user.providers
    : [...user.providers, "credentials"];

  return updateUser(userId, { passwordHash, providers });
}
