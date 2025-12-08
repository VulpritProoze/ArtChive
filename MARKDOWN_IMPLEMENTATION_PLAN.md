# Markdown Implementation Plan

## Overview
This plan outlines the implementation of markdown text formatting with @mentions support for posts, comments, and critiques in the ArtChive platform.

---

## Phase 1: Core Markdown Infrastructure

### 1.1 Frontend Dependencies
- [ ] Install `react-markdown` package
- [ ] Install `remark-gfm` (GitHub Flavored Markdown support)
- [ ] Install `rehype-raw` (optional, for HTML support if needed)
- [ ] Install `rehype-sanitize` (optional, for additional security)

**Command:**
```bash
npm install react-markdown remark-gfm
```

### 1.2 Create Markdown Renderer Component
**File:** `frontend/src/components/common/markdown-renderer.component.tsx`

**Features:**
- [ ] Basic markdown rendering with react-markdown
- [ ] Custom link component for @mentions (convert `@username` to profile links)
- [ ] Custom link component for regular URLs
- [ ] Styling with Tailwind prose classes
- [ ] Support for code blocks with syntax highlighting (optional)
- [ ] Support for tables, lists, blockquotes (via remark-gfm)

**Props:**
```typescript
interface MarkdownRendererProps {
  content: string;
  className?: string;
  allowHtml?: boolean; // default: false
}
```

### 1.3 Create Mention Parser Utility
**File:** `frontend/src/utils/mention-parser.util.ts`

**Functions:**
- [ ] `parseMentions(text: string): Mention[]` - Extract all @mentions from text
- [ ] `convertMentionsToMarkdown(text: string): string` - Convert @username to markdown links
- [ ] `validateMentions(text: string, existingUsers: User[]): ValidationResult` - Validate mentions exist

**Types:**
```typescript
interface Mention {
  username: string;
  startIndex: number;
  endIndex: number;
}
```

---

## Phase 2: Post Form Modal Enhancements

### 2.1 Markdown Toolbar Component
**File:** `frontend/src/components/common/posts-feature/markdown-toolbar.component.tsx`

**Features:**
- [ ] Toggle visibility state (shown/hidden)
- [ ] Grid layout with markdown formatting buttons
- [ ] Button categories:
  - **Text Formatting:**
    - Bold (`**text**`)
    - Italic (`*text*`)
    - Strikethrough (`~~text~~`)
    - Code inline (`` `code` ``)
  - **Headers:**
    - H1 (`# Header`)
    - H2 (`## Header`)
    - H3 (`### Header`)
  - **Lists:**
    - Unordered list (`- item`)
    - Ordered list (`1. item`)
  - **Links & Media:**
    - Link (`[text](url)`)
    - Image (`![alt](url)`)
  - **Other:**
    - Blockquote (`> quote`)
    - Horizontal rule (`---`)
    - Code block (`` ```code``` ``)

**Props:**
```typescript
interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onFormat: (format: string, selectedText?: string) => void;
  isVisible: boolean;
}
```

**Functionality:**
- [ ] When text is selected and a format button is clicked:
  - Get selected text from textarea
  - Apply markdown formatting to selected text
  - Replace selection with formatted text
  - Maintain cursor position after insertion
- [ ] When no text is selected:
  - Insert markdown syntax at cursor position
  - Place cursor between syntax markers (e.g., `**|**`)

### 2.2 Text Selection Handler
**File:** `frontend/src/utils/text-selection.util.ts`

**Functions:**
- [ ] `getSelectedText(textarea: HTMLTextAreaElement): { text: string, start: number, end: number }`
- [ ] `replaceSelectedText(textarea: HTMLTextAreaElement, replacement: string): void`
- [ ] `insertTextAtCursor(textarea: HTMLTextAreaElement, text: string): void`
- [ ] `wrapSelectedText(textarea: HTMLTextAreaElement, prefix: string, suffix: string): void`

### 2.3 Modify Post Form Modal
**File:** `frontend/src/components/common/posts-feature/modal/post-form.modal.tsx`

**Changes:**
- [ ] Add state for markdown toolbar visibility
- [ ] Add ref for textarea element
- [ ] Add markdown button next to hashtag/@ buttons (line ~394)
- [ ] Add MarkdownToolbar component above textarea (conditionally rendered)
- [ ] Implement toolbar toggle functionality
- [ ] Connect toolbar format actions to textarea

**Button Placement:**
```
[Emoji] [Hashtag] [@ Mention] [Markdown] ← New button here
```

**Toolbar Placement:**
```
[Markdown Toolbar - appears when markdown button is active]
[Textarea with description]
```

**State Management:**
```typescript
const [showMarkdownToolbar, setShowMarkdownToolbar] = useState(false);
const textareaRef = useRef<HTMLTextAreaElement>(null);
```

---

## Phase 3: Backend Mention Detection & Notifications

### 3.1 Add Mention Notification Type
**File:** `backend/common/utils/choices.py`

**Changes:**
- [ ] Add `'post_mention'` to `NOTIFICATION_OBJECT_CHOICES`
- [ ] Add `post_mention='Post Mention'` to `NOTIFICATION_TYPES`

### 3.2 Create Mention Utilities
**File:** `backend/post/utils.py` (create new file or add to existing)

**Functions:**
- [ ] `extract_mentions(text: str) -> list[str]` - Extract usernames from @mentions
- [ ] `validate_mentions(usernames: list[str]) -> dict[str, bool]` - Check which users exist
- [ ] `create_mention_notifications(post, description: str, author: User) -> list[Notification]` - Create notifications for mentioned users

**Logic:**
- Extract all @mentions using regex: `r'@(\w+)'`
- Filter out duplicate mentions
- Skip if user mentions themselves
- Skip if user doesn't exist (silently ignore)
- Create notification for each valid mention
- Return list of created notifications

### 3.3 Update Post Creation/Update Views
**File:** `backend/post/views.py`

**Changes:**
- [ ] Import mention utilities
- [ ] In `PostCreateView.perform_create()`:
  - After post creation, call `create_mention_notifications()`
  - Pass post, description, and author
- [ ] In `PostUpdateView.perform_update()`:
  - Compare old and new descriptions
  - Only create notifications for NEW mentions (not already mentioned)
  - Call `create_mention_notifications()` for new mentions only

**Considerations:**
- [ ] Rate limiting: Prevent spam by limiting mentions per post (e.g., max 10)
- [ ] Cooldown: Prevent rapid mention spam from same user
- [ ] Validation: Optionally validate mentions exist before saving post

### 3.4 Update Post Serializer (Optional)
**File:** `backend/post/serializers.py`

**Optional Enhancements:**
- [ ] Add `validate_description()` method to check mention validity
- [ ] Option 1: Silently ignore invalid mentions
- [ ] Option 2: Raise validation error if mention doesn't exist
- [ ] Option 3: Return warnings but allow post creation

---

## Phase 4: Update Display Components

### 4.1 Update Post Card Component
**File:** `frontend/src/components/common/posts-feature/post-card.component.tsx`

**Changes:**
- [ ] Replace plain text description rendering with `MarkdownRenderer`
- [ ] Update line ~199-202 to use markdown renderer
- [ ] Ensure proper styling and spacing

**Before:**
```tsx
<p className="text-base text-base-content whitespace-pre-wrap break-words">
  {postItem.description}
</p>
```

**After:**
```tsx
<MarkdownRenderer 
  content={postItem.description} 
  className="text-base text-base-content"
/>
```

### 4.2 Update Comment Components
**Files:**
- `frontend/src/components/common/posts-feature/comment.component.tsx`
- `frontend/src/components/common/posts-feature/reply.component.tsx`

**Changes:**
- [ ] Replace plain text rendering with `MarkdownRenderer`
- [ ] Ensure mentions are clickable and navigate to profiles

### 4.3 Update Critique Components
**File:** `frontend/src/components/common/posts-feature/critique-section.component.tsx`

**Changes:**
- [ ] Replace plain text rendering with `MarkdownRenderer` for critique text
- [ ] Ensure mentions work in critiques

### 4.4 Update Novel Content (Optional)
**File:** `frontend/src/components/common/posts-feature/novel-renderer.component.tsx`

**Considerations:**
- [ ] Novel content might need different markdown rendering (preserve formatting)
- [ ] May need special handling for chapter content

---

## Phase 5: Mention Autocomplete (Future Enhancement)

### 5.1 User Search API
**File:** `backend/core/views.py` or `backend/searchapp/views.py`

**Features:**
- [ ] Create endpoint: `GET /api/users/search?q=username&limit=10`
- [ ] Return users matching query (username, first_name, last_name)
- [ ] Limit results to 10-20 users
- [ ] Include profile picture, username, full name

### 5.2 Mention Autocomplete Component
**File:** `frontend/src/components/common/posts-feature/mention-autocomplete.component.tsx`

**Features:**
- [ ] Detect `@` character in textarea
- [ ] Show dropdown with matching users
- [ ] Allow selection with keyboard (arrow keys, enter)
- [ ] Insert selected username into textarea
- [ ] Position dropdown near cursor

**Integration:**
- [ ] Add to post form modal
- [ ] Add to comment form modal
- [ ] Add to critique form modal

---

## Phase 6: Testing & Validation

### 6.1 Frontend Testing
- [ ] Test markdown rendering for all supported syntax
- [ ] Test mention parsing and link generation
- [ ] Test toolbar formatting with selected text
- [ ] Test toolbar formatting without selection
- [ ] Test cursor position after formatting
- [ ] Test edge cases (empty text, special characters)

### 6.2 Backend Testing
- [ ] Test mention extraction from various text formats
- [ ] Test notification creation for mentions
- [ ] Test duplicate mention handling
- [ ] Test self-mention handling (should not notify)
- [ ] Test invalid mention handling (non-existent users)
- [ ] Test mention limits (rate limiting)

### 6.3 Integration Testing
- [ ] Test full flow: Create post with mentions → Notifications sent
- [ ] Test mention links navigate correctly
- [ ] Test markdown renders correctly in all contexts
- [ ] Test mobile responsiveness of toolbar

---

## Phase 7: Documentation & User Guide

### 7.1 Markdown Syntax Guide
**File:** `MARKDOWN_SYNTAX_GUIDE.md` (optional)

**Content:**
- [ ] List all supported markdown syntax
- [ ] Provide examples for each syntax
- [ ] Explain mention syntax (`@username`)
- [ ] Include tips and best practices

### 7.2 UI Tooltips
- [ ] Add tooltips to markdown toolbar buttons
- [ ] Add help text in post form modal
- [ ] Add keyboard shortcuts documentation (optional)

---

## Implementation Order

### Priority 1 (Core Functionality)
1. Phase 1: Core Markdown Infrastructure
2. Phase 2: Post Form Modal Enhancements
3. Phase 4.1: Update Post Card Component

### Priority 2 (Mentions & Notifications)
4. Phase 3: Backend Mention Detection & Notifications
5. Phase 4.2-4.3: Update Comment & Critique Components

### Priority 3 (Polish & Enhancements)
6. Phase 4.4: Update Novel Content (if needed)
7. Phase 5: Mention Autocomplete (future)
8. Phase 6: Testing & Validation
9. Phase 7: Documentation

---

## Technical Considerations

### Security
- [ ] Sanitize markdown output (react-markdown does this by default)
- [ ] Validate mention usernames (prevent XSS via usernames)
- [ ] Rate limit mention notifications (prevent spam)
- [ ] Consider mention cooldown per user

### Performance
- [ ] Lazy load markdown renderer if needed
- [ ] Cache parsed mentions
- [ ] Optimize notification creation (bulk operations if possible)

### Accessibility
- [ ] Ensure markdown toolbar is keyboard accessible
- [ ] Add ARIA labels to toolbar buttons
- [ ] Ensure markdown content is screen-reader friendly

### Mobile Support
- [ ] Ensure toolbar is usable on mobile devices
- [ ] Consider collapsible toolbar for small screens
- [ ] Test text selection on mobile browsers

---

## Markdown Syntax Support Matrix

| Feature | Syntax | Priority | Status |
|---------|--------|----------|--------|
| Bold | `**text**` or `__text__` | High | ✅ |
| Italic | `*text*` or `_text_` | High | ✅ |
| Strikethrough | `~~text~~` | Medium | ✅ |
| Code inline | `` `code` `` | High | ✅ |
| Code block | ` ```code``` ` | Medium | ✅ |
| Headers | `# H1`, `## H2`, `### H3` | Medium | ✅ |
| Links | `[text](url)` | High | ✅ |
| Images | `![alt](url)` | Low | ⚠️ |
| Lists | `- item` or `1. item` | High | ✅ |
| Blockquote | `> quote` | Low | ⚠️ |
| Horizontal rule | `---` | Low | ⚠️ |
| Mentions | `@username` | High | ✅ |
| Tables | GFM syntax | Low | ⚠️ |

✅ = Implement in Phase 1-2
⚠️ = Optional, implement later if needed

---

## File Structure

```
frontend/src/
├── components/
│   ├── common/
│   │   ├── markdown-renderer.component.tsx          [NEW]
│   │   └── posts-feature/
│   │       ├── markdown-toolbar.component.tsx       [NEW]
│   │       ├── mention-autocomplete.component.tsx  [NEW - Future]
│   │       └── modal/
│   │           └── post-form.modal.tsx             [MODIFY]
│   └── ...
├── utils/
│   ├── mention-parser.util.ts                      [NEW]
│   └── text-selection.util.ts                      [NEW]
└── ...

backend/
├── post/
│   ├── utils.py                                    [NEW or MODIFY]
│   ├── views.py                                    [MODIFY]
│   └── serializers.py                              [MODIFY - Optional]
├── common/
│   └── utils/
│       └── choices.py                              [MODIFY]
└── ...
```

---

## Estimated Timeline

- **Phase 1**: 2-3 hours
- **Phase 2**: 4-6 hours
- **Phase 3**: 3-4 hours
- **Phase 4**: 2-3 hours
- **Phase 5**: 4-6 hours (Future)
- **Phase 6**: 2-3 hours
- **Phase 7**: 1-2 hours

**Total (Phases 1-4, 6-7)**: ~15-22 hours
**With Autocomplete (Phase 5)**: ~19-28 hours

---

## Notes

- Markdown is stored as-is in the database (no preprocessing)
- Rendering happens entirely client-side
- Mentions are converted to markdown links during rendering
- Notifications are created server-side during post creation/update
- Toolbar can be toggled on/off to save screen space
- All markdown syntax is optional - users can still type plain text

---

## Success Criteria

✅ Users can format text using markdown syntax
✅ Users can mention other users with @username
✅ Mentioned users receive notifications
✅ Mentions are clickable and navigate to profiles
✅ Markdown renders correctly in all contexts (posts, comments, critiques)
✅ Toolbar provides easy access to common formatting
✅ Selected text can be formatted with toolbar buttons
✅ Implementation is performant and accessible

