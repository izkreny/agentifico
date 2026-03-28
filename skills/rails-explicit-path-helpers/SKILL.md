---
name: rails-explicit-path-helpers
description: "Use when you need to convert Rails redirect_to/link_to/button_to route targets from polymorphic or shorthand forms (objects, arrays, helpers without args) to explicit Rails route *_path helpers with full arguments, then verify consistency across controllers and views. Trigger phrases: explicit route path helpers, full arguments, route helper cleanup, polymorphic route cleanup."
---

# Rails Explicit Path Helpers

## Goal
Standardize navigation and redirect targets to explicit Rails route path helpers with full arguments for readability and consistency.

## Use When
- A request asks to "convert all route paths" in `redirect_to`, `link_to`, or `button_to`.
- The codebase mixes polymorphic targets (`@record`, `[parent, child]`) with explicit route helpers.
- A nested-resource area (for example `groups/events/registrations`) should match another area's explicit routing style.

## Workflow

### 1. Determine Route Shape First
- Read `config/routes.rb` before editing.
- Identify whether resources are plural (`resources`) or singular (`resource`).
- Identify nesting depth and argument order for helper calls.

### 2. Find Targets to Convert
Search in selected controllers and views for:
- `redirect_to`
- `link_to`
- `button_to`

Flag these patterns:
- Polymorphic object targets: `@record`
- Array targets: `[parent, child]` or `[:edit, parent, child]`
- Helper calls missing required nested args (for example `group_event_path` used as a bare helper)

### 3. Convert to Explicit Helpers
Apply explicit route helper calls with full arguments.

Examples:
- `redirect_to @group`                     -> `redirect_to group_path(@group)`
- `redirect_to [@group, @event]`           -> `redirect_to group_event_path(@group, @event)`
- `link_to "Show", group`                  -> `link_to "Show", group_path(group)`
- `link_to "Edit", [:edit, @group, event]` -> `link_to "Edit", edit_group_event_path(@group, event)`
- `button_to "Destroy", [@group, member]`  -> `button_to "Destroy", group_member_path(@group, member)`

For singular resources, use explicit singular helpers (for example `user_path`, `user_profile_path`) as defined by routes.

### 4. Keep Style Consistent
- Preserve existing formatting and indentation.
- Keep controller redirects in the established multiline style when options are present (for example `notice`, `status`).
- Do not change strong params or business logic unless requested!

### 5. Verify Before Finishing
Run scans to confirm no shorthand remains in targeted files:
- `redirect_to` with arrays or objects
- `link_to`/`button_to` with arrays or objects
- Nested route helper calls missing required args

Then run diagnostics for edited files and ensure no new errors.

## Done Criteria
- All targeted `redirect_to`, `link_to`, and `button_to` calls use explicit Rails route path helpers.
- Nested resource route helpers include all required arguments in correct order.
- Edited files are error-free in diagnostics.
