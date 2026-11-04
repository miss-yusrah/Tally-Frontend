"use client";

import type { FieldValues, Resolver } from "react-hook-form";

/**
 * react-hook-form resolver that code-splits zod and the schema module.
 *
 * zod is one of the heaviest dependencies in the bundle; eagerly importing it
 * from a form pushes it into that page's First Load JS. This helper defers
 * both the resolver package and the schema to the first validation run
 * (webpack caches the chunk after the first load), so forms render without
 * it and validation behaves exactly as before.
 *
 * Usage:
 *   resolver: lazyZodResolver<SignInFormData>(
 *     () => import("./schemas").then((m) => m.signInSchema)
 *   )
 */
export function lazyZodResolver<TFieldValues extends FieldValues>(
  loadSchema: () => Promise<unknown>
): Resolver<TFieldValues> {
  /** De-duplicate concurrent validations while the chunk is still loading. */
  let pending: Promise<unknown> | null = null;

  return async (values, context, options) => {
    pending ??= loadSchema();
    const [{ zodResolver }, schema] = await Promise.all([import("@hookform/resolvers/zod"), pending]);
    const resolve =
      zodResolver(schema as never) as Resolver<TFieldValues>;
    return resolve(values, context, options);
  };
}
