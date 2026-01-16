---
name: TypeScript Code Review
description: Comprehensive TypeScript/JavaScript code review skill. Use when reviewing PRs, analyzing code quality, or when user asks for code review, PR review, or quality check. Covers type safety, async patterns, security, performance, and best practices.
---

# TypeScript Code Review

Review code changes systematically using a four-phase approach.

## Phase 1: Context

Before reviewing, understand:
- What problem does this change solve?
- What files are affected?
- Are there related tests?

## Phase 2: Architecture Review

Check high-level concerns:
- Does the change fit existing patterns?
- Are responsibilities properly separated?
- Any unnecessary coupling introduced?

## Phase 3: Line-by-Line Analysis

### Type Safety

**Critical Issues:**
- `any` types → Use `unknown` with type guards instead
- Unsafe type assertions → Use proper type narrowing
- Missing null checks on optional properties
- Array access without bounds checking (enable `noUncheckedIndexedAccess`)

**Preferred Patterns:**
```typescript
// Bad: any
function process(data: any) { return data.value; }

// Good: unknown with guard
function process(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return String((data as { value: unknown }).value);
  }
  throw new Error('Invalid data');
}
```

### Async/Error Handling

**Check for:**
- Unhandled promise rejections
- Missing try-catch in async functions
- Race conditions (use `AbortController`)
- `Promise.all` vs `Promise.allSettled` choice

**Pattern:**
```typescript
// Bad: floating promise
async function load() {
  fetchData(); // No await, no catch
}

// Good: proper handling
async function load() {
  try {
    await fetchData();
  } catch (error) {
    handleError(error);
  }
}
```

### Immutability

**Enforce:**
- `readonly` on function parameters that shouldn't mutate
- Return new objects instead of mutating inputs
- Use spread operators for updates

### Security

**Watch for:**
- XSS vulnerabilities (unsanitized DOM insertion)
- Injection attacks (string interpolation in queries)
- Exposed secrets or credentials
- Unsafe `eval()` or `Function()` usage

### Performance

**Identify:**
- N+1 query patterns
- Unnecessary re-renders (React)
- Memory leaks (unremoved listeners)
- Inefficient algorithms (O(n²) when O(n) possible)

## Phase 4: Summary

Provide clear feedback with severity levels:

| Level | Use For |
|-------|---------|
| **Critical** | Security issues, breaking changes, logic errors |
| **Warning** | Convention violations, performance problems |
| **Suggestion** | Naming, optimization opportunities |
| **Praise** | Well-written code worth highlighting |

## Feedback Style

Use collaborative language:
- "Consider..." or "What if..." instead of "You should..."
- Ask questions: "Is this intentional?" rather than "This is wrong"
- Be specific: Include file paths and line numbers
- Be educational: Explain *why*, not just *what*

## Checklist

Before approving, verify:

- [ ] No `any` types (use `unknown`)
- [ ] `interface` preferred over `type` (except unions)
- [ ] No type assertions without justification
- [ ] Async operations have error handling
- [ ] No floating promises
- [ ] Immutability preserved (readonly params)
- [ ] No security vulnerabilities
- [ ] Tests included for new functionality
- [ ] No dead code or console.logs
- [ ] Naming follows conventions (PascalCase components, camelCase functions)

## Output Format

```markdown
## Code Review: [PR Title or File]

### Summary
[1-2 sentence overview]

### Critical Issues
- **[file:line]** [Issue description]
  - Suggested fix: [code or explanation]

### Warnings
- **[file:line]** [Issue]

### Suggestions
- **[file:line]** [Improvement idea]

### Praise
- **[file:line]** [What's well done]

### Decision
[ ] Approve | [ ] Request Changes | [ ] Comment
```
