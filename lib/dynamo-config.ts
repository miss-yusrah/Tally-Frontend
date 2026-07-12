/** Env-only DynamoDB check — no AWS SDK imports (safe for client bundles). */
export function isDynamoConfigured(): boolean {
  return Boolean(
    process.env.DYNAMODB_TABLE_NAME &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
  );
}
