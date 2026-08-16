# Single Next app, with a service module as the only write path

The previous repo was a pnpm/turbo monorepo with a Connect RPC layer and protobuf codegen in
front of the database. For a two-person household app that is more machinery than the problem
needs, so this is one Next.js app with no workspaces and no RPC layer.

The one thing worth keeping from that shape is its rule: every write goes through one place.
Here that place is `src/server/services/` — plain async TypeScript functions that are the only
code permitted to touch the database. Server Actions call them for the UI, and `/api/mcp` calls
the same functions, so an agent and a human get identical guarantees.

## Considered options

Putting the logic directly in Server Actions was rejected because Server Actions are a
React transport and awkward to call from an MCP handler, which would have meant two
implementations of every invariant. Pushing everything into RLS and Postgres triggers was
rejected because the two-phase propose/confirm write flow the MCP server needs is unpleasant
to express in PL/pgSQL.

## Consequences

The browser never holds a key that can write. Invariants cheap to express in Postgres —
generated columns, partial unique indexes, check constraints — still live there, because they
hold even against a hand-written SQL statement.
