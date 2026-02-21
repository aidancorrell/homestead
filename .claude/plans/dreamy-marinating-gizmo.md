# Phase 7 (Polish) + Phase 8 (Deployment) Implementation Plan

## Context

Homestead is a working MVP with auth, servers, text chat, and voice. This plan adds polish features (presence, message edit/delete, password change) and production deployment packaging (Docker, Nginx, coturn). Phase 8 also permanently fixes voice stability by eliminating the Vite WebSocket proxy.

Branch: `phase-7-8-polish-deployment`

---

## Phase 7: Polish

### Step 1: Presence System

Server-side is already done (`server/src/socket/presenceHandler.ts` emits `user:online`/`user:offline` and updates DB). Socket types already define these events. Need client-side only.

**1a. Server endpoint for initial online users**

- `server/src/services/user.service.ts` — add `getOnlineUsers()`: query `SELECT id FROM users WHERE status = 'online'`
- `server/src/controllers/user.controller.ts` — add `getOnlineUsers` handler
- `server/src/routes/user.routes.ts` — add `GET /online` route (before `/me` routes)

**1b. Client presence store**

- Create `client/src/stores/presenceStore.ts` — Zustand store with `onlineUsers: Set<string>`, actions: `setOnlineUsers`, `addOnlineUser`, `removeOnlineUser`

**1c. Wire into useSocket**

- `client/src/hooks/useSocket.ts` — on connect, fetch `GET /users/online` and call `setOnlineUsers`. Add listeners for `user:online` → `addOnlineUser`, `user:offline` → `removeOnlineUser`

**1d. Members list in ChannelSidebar**

- `client/src/types/models.ts` — add flattened fields to `ServerMember` (username, display_name, avatar_url, status) since the server JOIN returns them flat, not nested under `user`
- `client/src/components/layout/ChannelSidebar.tsx` — add member list section below channel list showing online/offline members with Avatar status dots. Online first, then offline (dimmed).

### Step 2: Message Editing & Deletion

DB already has `edited_at` field. Message type already has `edited_at: string | null`.

**2a. Server — service**

- `server/src/services/message.service.ts` — add `editMessage(id, authorId, content)` and `deleteMessage(id, authorId)`. Author-only authorization. Edit sanitizes content and sets `edited_at`.

**2b. Server — controller**

- `server/src/controllers/message.controller.ts` — add `editMessage` and `deleteMessage` handlers. After DB update, broadcast via `getIO().to('channel:...').emit(...)`.

**2c. Server — routes**

- `server/src/routes/message.routes.ts` — add:
  - `PATCH /:channelId/messages/:id` → `editMessage`
  - `DELETE /:channelId/messages/:id` → `deleteMessage`

**2d. Socket types**

- `client/src/types/socket.ts` — add to `ServerToClientEvents`:
  - `'message:edit': (message: Message) => void`
  - `'message:delete': (data: { id: string; channelId: string }) => void`

**2e. Client — messageStore**

- `client/src/stores/messageStore.ts` — add `updateMessage(channelId, message)` and `removeMessage(channelId, messageId)` actions

**2f. Client — socket listeners**

- `client/src/hooks/useSocket.ts` — add `message:edit` → `updateMessage`, `message:delete` → `removeMessage`

**2g. Client — MessageItem UI**

- `client/src/components/chat/MessageItem.tsx` — add hover action buttons (edit/delete) for own messages. Show "(edited)" when `edited_at` is set. New props: `isOwnMessage`, `onEditStart`, `onDelete`. Both the header and compact variants need `relative group` classes.

**2h. Client — MessageArea wiring**

- `client/src/components/chat/MessageArea.tsx` — add `editingMessage` state, `handleDelete` function (calls `api.delete`), pass new props to MessageItem and MessageInput

**2i. Client — MessageInput edit mode**

- `client/src/components/chat/MessageInput.tsx` — accept optional `editingMessage`, `onEditCancel`, `onEditComplete` props. When editing: populate textarea, send via `api.patch` instead of socket, Escape to cancel. Show "Editing message" banner.

### Step 3: Password Change

**3a. Server**

- `server/src/services/user.service.ts` — add `changePassword(userId, currentPassword, newPassword)`: verify current password with bcrypt, hash new password, update DB
- `server/src/controllers/user.controller.ts` — add `changePassword` handler
- `server/src/routes/user.routes.ts` — add `PATCH /me/password`

**3b. Client**

- `client/src/components/settings/SettingsModal.tsx` — add "Change Password" section with current/new/confirm fields between display name and audio settings

---

## Phase 8: Deployment

### Step 4: Server Dockerfile

- Create `server/Dockerfile` — multi-stage: build TypeScript with `npm run build`, then production image with `node dist/index.js`. Node 22 Alpine.
- Create `server/.dockerignore` — exclude node_modules, dist, .env, logs

### Step 5: Client Dockerfile + Nginx

- Create `client/Dockerfile` — multi-stage: build Vite app, copy dist into Nginx Alpine. Nginx serves static files and proxies `/api` + `/socket.io` to the `server` container.
- Create `client/nginx.conf` — SPA fallback, API proxy (`proxy_pass http://server:3001`), WebSocket upgrade headers for Socket.IO, gzip, static asset caching
- Create `client/.dockerignore`

### Step 6: docker-compose.prod.yml

Full production stack:
- `postgres` — PostgreSQL 16 Alpine, health check, internal network only
- `server` — Express app, depends on healthy postgres, env vars from `.env`
- `client` — Nginx, exposes port 80, proxies to server
- `coturn` — TURN server for WebRTC NAT traversal, exposes 3478 + relay port range

Only `client` (HTTP) and `coturn` (TURN) are externally exposed. Server and postgres are internal-only.

### Step 7: ICE/TURN Config API

The client needs TURN credentials at runtime (not build time) for production WebRTC.

- `server/src/config/env.ts` — add optional TURN env vars (`TURN_URL`, `TURN_USER`, `TURN_PASSWORD`)
- Create `server/src/routes/config.routes.ts` — `GET /ice` endpoint returns ICE servers array (STUN + TURN if configured)
- `server/src/index.ts` — register config routes at `/api/config`
- `client/src/lib/webrtc.ts` — replace hardcoded `RTC_CONFIG` with dynamic fetch from `/api/config/ice` (cached, with STUN fallback)
- `client/src/lib/voiceManager.ts` — call `fetchIceConfig()` before creating peer connections

### Step 8: Production Hardening

- `server/src/controllers/auth.controller.ts` — make refresh cookie `secure: true` when `NODE_ENV === 'production'`
- `.env.example` — add TURN, Docker, and production vars with documentation comments

### Step 9: DEPLOYMENT.md

Documentation covering: prerequisites, quick start (`docker compose -f docker-compose.prod.yml up -d --build`), configuration table, network setup (port forwarding), SSL options, TURN setup, updating, troubleshooting.

---

## Files Modified/Created Summary

### Modified (Phase 7)
- `server/src/services/user.service.ts` — online users query, password change
- `server/src/controllers/user.controller.ts` — online users, password change handlers
- `server/src/routes/user.routes.ts` — new routes
- `server/src/services/message.service.ts` — edit/delete functions
- `server/src/controllers/message.controller.ts` — edit/delete handlers
- `server/src/routes/message.routes.ts` — PATCH/DELETE routes
- `client/src/types/socket.ts` — message:edit, message:delete events
- `client/src/types/models.ts` — flattened ServerMember fields
- `client/src/stores/messageStore.ts` — updateMessage, removeMessage
- `client/src/hooks/useSocket.ts` — presence + message edit/delete listeners
- `client/src/components/layout/ChannelSidebar.tsx` — member list
- `client/src/components/chat/MessageItem.tsx` — edit/delete UI + edited indicator
- `client/src/components/chat/MessageArea.tsx` — editing state, delete handler
- `client/src/components/chat/MessageInput.tsx` — edit mode
- `client/src/components/settings/SettingsModal.tsx` — password change form

### Created (Phase 7)
- `client/src/stores/presenceStore.ts`

### Modified (Phase 8)
- `server/src/config/env.ts` — TURN env vars
- `server/src/index.ts` — register config routes
- `client/src/lib/webrtc.ts` — dynamic ICE config
- `client/src/lib/voiceManager.ts` — fetch ICE before peer connections
- `server/src/controllers/auth.controller.ts` — secure cookie in production
- `.env.example` — additional vars

### Created (Phase 8)
- `server/Dockerfile`
- `server/.dockerignore`
- `client/Dockerfile`
- `client/nginx.conf`
- `client/.dockerignore`
- `docker-compose.prod.yml`
- `server/src/routes/config.routes.ts`
- `DEPLOYMENT.md`

---

## Implementation Order

1. Presence system (Steps 1a-1d)
2. Message edit/delete (Steps 2a-2i)
3. Password change (Steps 3a-3b)
4. Server Dockerfile (Step 4)
5. Client Dockerfile + Nginx (Step 5)
6. docker-compose.prod.yml (Step 6)
7. ICE/TURN API (Step 7)
8. Production hardening (Step 8)
9. DEPLOYMENT.md (Step 9)

## Verification

1. **Presence**: Open 2 browsers, log in as different users, verify member list shows online/offline status correctly
2. **Message edit**: Hover own message, click edit, modify, press Enter — verify "(edited)" appears and other users see the update
3. **Message delete**: Hover own message, click delete — verify message disappears for all users
4. **Password change**: Change password in settings, logout, login with new password
5. **Docker build**: `docker compose -f docker-compose.prod.yml up --build` — verify app loads on port 80, API proxied correctly, WebSocket connects
6. **Voice in Docker**: Join voice channel from 2 browsers — verify audio works through Nginx (no more Vite proxy instability)
