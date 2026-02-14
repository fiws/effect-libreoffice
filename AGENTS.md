# Effect LibreOffice - Developer Guide

## Commands

- **Build**: `pnpm build` (Runs `tsdown`)
- **Test (All)**: `pnpm test` (Runs `vitest run`)
- **Test (Single)**: `pnpm test path/to/test.ts`
- **Type Check**: `pnpm type-check` (Runs `tsc --noEmit`)
- **Lint & Format**: `pnpm biome check .` (or `pnpm biome check --apply .` to fix)

## Code Style & Conventions

### General

- **Strict TypeScript**: The project uses strict TypeScript settings. Never use "any". Never use "as" casting unless it is absolutely necessary.

### Effect Ecosystem

- **Generators**: Use `Effect.gen(function* () { ... })` for effectful computations.
- **Piping**: Use `.pipe()` for chaining operations and providing layers/services.
- **Error Handling**:
  - Use `Data.TaggedError` for custom errors (e.g., `class MyError extends Data.TaggedError("MyError")<{ ... }> {}`).
  - Handle errors using `Effect.catchAll` or `Effect.catchTag`.
- **Layers & Services**:
  - Define services using `Context.Tag`.
  - Expose implementations as static `layer...` properties on the service class (e.g., `LibreOffice.layerCli`).
  - Use `Effect.provide(Layer)` to inject dependencies.

### Naming

- **Services/Layers**: PascalCase (e.g., `LibreOffice`, `UnoClient`).
- **Functions/Methods**: camelCase (e.g., `convertLocalFile`, `fromFile`).
- **Types/Interfaces**: PascalCase.
- **Effect Variables**: Often plain names, but ensure clarity (e.g., `fs` for FileSystem, `path` for Path).

### Testing

- Use `@effect/vitest` for testing.
- Use `it.layer(Layer)(...)` to provide context to tests.
- Use `it.effect(...)` or `it.scoped(...)` for effectful tests.
- Use `assert` from `@effect/vitest` for assertions.
- Example:

  ```typescript
  import { it, assert } from "@effect/vitest";
  import { Effect } from "effect";

  it.effect(
    "should work",
    Effect.gen(function* () {
      // test logic
      assert.strictEqual(1, 1);
    }),
  );
  ```

## Error Handling Pattern

The project uses a standard error handling pattern with `Data.TaggedError`:

```typescript
export class LibreOfficeError extends Data.TaggedError("LibreOfficeError")<{
  reason: Reason;
  message: string;
  cause?: unknown;
}> {}
```

When handling errors, checking the `reason` field is common.

## Docker / Integration Tests

- Some tests (like `ubuntu-docker.test.ts`) require Docker.
- They use `testcontainers` to spin up necessary environments (e.g., Ubuntu with LibreOffice).
- Ensure Docker is running if executing these tests.
