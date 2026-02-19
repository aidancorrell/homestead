# Homestead - Codebase Reference

## What This Is
Self-hosted Discord alternative. Phases 1-10 complete (MVP + polish + deployment + VPS/SSL + security hardening). Invite-only registration. Production Docker stack with HTTPS support.

## Tech Stack
- **Client**: React 19 + TypeScript + Vite + Tailwind CSS 4 + Zustand + Socket.IO client + WebRTC
- **Server**: Node.js + Express 5 + Socket.IO 4 + Knex + PostgreSQL 16 + bcrypt + JWT + Zod + sanitize-html + express-rate-limit
- **Dev**: Docker Compose for Postgres only. Vite dev server (HTTPS via basicSsl) proxies `/api` and `/socket.io` to Express on port 3001.
- **Prod**: `docker-compose.prod.yml` — Postgres + Express server + Nginx (multi-stage build: builds React app + serves with SSL termination, proxies API/WebSocket). Certbot sidecar for Let's Encrypt. Access via `https://${DOMAIN}` (or `http://localhost` without SSL).

## Project Structure
```
homestead/
├── docker-compose.yml              # Dev: PostgreSQL only
├── docker-compose.prod.yml         # Prod: full stack with SSL support
├── .env / .env.example
├── init-ssl.sh                     # First-time SSL cert provisioning
├── nginx/
│   ├── Dockerfile                  # Multi-stage: builds React app + Nginx with SSL
│   ├── nginx.conf                  # HTTP-only config (pre-SSL)
│   ├── nginx-ssl.conf              # HTTPS config (post-SSL)
│   └── docker-entrypoint.sh        # Picks config based on cert existence
├── coturn/
│   └── turnserver.conf             # TURN server static config
├── client/
│   ├── vite.config.ts               # proxy /api→:3001, /socket.io→:3001 (ws), host 0.0.0.0
│   └── src/
│       ├── components/
│       │   ├── ui/                  # Button, Input, Modal, Avatar, Spinner, Tooltip, ErrorBoundary
│       │   ├── layout/             # AppLayout, ServerSidebar, ChannelSidebar, ChannelView, UserPanel
│       │   ├── auth/               # LoginForm, RegisterForm, AuthGuard
│       │   ├── server/             # CreateServerModal, InviteModal, ServerIcon
│       │   ├── channel/            # ChannelList, ChannelItem, CreateChannelModal
│       │   ├── chat/               # MessageArea, MessageItem, MessageInput, MarkdownRenderer, ChatHeader
│       │   ├── voice/              # VoiceView, VoiceChannel, VoiceControls, VoiceUser
│       │   └── settings/           # SettingsModal, AudioSettings
│       ├── hooks/                   # useSocket, useVoice, useMediaStream
│       ├── stores/                  # authStore, serverStore, channelStore, messageStore, voiceStore, audioStore, uiStore
│       ├── lib/                     # api.ts, socket.ts, webrtc.ts, audioEngine.ts, voiceManager.ts, utils.ts
│       └── types/                   # api.ts, models.ts, socket.ts, voice.ts
└── server/
    └── src/
        ├── config/                  # env.ts (Zod), database.ts (Knex), knexfile.ts
        ├── middleware/              # auth.ts, errorHandler.ts, validate.ts, rateLimiter.ts
        ├── routes/                  # auth, server, channel, message, user
        ├── controllers/             # auth, server, channel, message, user
        ├── services/                # auth, server, channel, message, user
        ├── socket/                  # index.ts, chatHandler.ts, voiceHandler.ts, presenceHandler.ts
        ├── db/migrations/           # 001_users, 002_servers, 003_channels, 004_messages, 005_server_members, 006_security_hardening
        └── validators/              # auth.schema.ts, server.schema.ts, channel.schema.ts, user.schema.ts
```

## Database Schema (5 tables, all UUIDs)
- **users**: id, username(unique), display_name, email(nullable), password_hash, avatar_url, status('online'|'idle'|'dnd'|'offline'), token_version(int, default 0), timestamps
- **servers**: id, name, icon_url, owner_id(FK users), invite_code(unique 8-12 char), timestamps
- **channels**: id, server_id(FK servers), name, type('text'|'voice'), position, timestamps
- **messages**: id, channel_id(FK channels), author_id(FK users), content, edited_at, created_at. Index: (channel_id, created_at DESC)
- **server_members**: id, user_id, server_id, role('owner'|'admin'|'member'), joined_at. UNIQUE(user_id, server_id)

## Environment Variables (server/src/config/env.ts, Zod-validated)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_ACCESS_SECRET` - min 32 chars, access token signing (15m expiry)
- `JWT_REFRESH_SECRET` - min 32 chars, refresh token signing (7d expiry)
- `PORT` - default 3001
- `NODE_ENV` - development|production|test
- `CORS_ORIGIN` - default http://localhost:5173
- `TURN_URL` - optional TURN server URL
- `TURN_USER` - optional TURN username
- `TURN_PASSWORD` - optional TURN password

## Key Patterns

### Auth Flow
- **Invite-only registration**: requires a valid server invite_code, auto-joins that server on register
- No email required — registration uses username + password + invite_code
- Access token (15m) stored in memory via `setAccessToken()` in `client/src/lib/api.ts`
- Refresh token (7d) in httpOnly cookie (sameSite strict, path /api/auth)
- Cookie `secure` flag auto-detected from request (`req.secure || X-Forwarded-Proto`) — works on both HTTP and HTTPS
- Axios interceptor catches 401 → calls `/auth/refresh` → retries original request
- Refresh queue prevents duplicate refresh calls
- **Token versioning**: token_version column on users table; refresh tokens include tokenVersion claim. Logout increments token_version, invalidating all existing refresh tokens. Password change also increments token_version.
- **Timing-safe login**: always runs bcrypt.compare (uses dummy hash when user not found) to prevent user enumeration
- **Explicit JWT algorithm**: HS256 specified in both sign and verify to prevent algorithm confusion attacks

### Socket.IO
- Server: `server/src/socket/index.ts` creates IO server with JWT auth middleware (verifies token, sets socket.data.userId/username)
- Client: `client/src/lib/socket.ts` exports `connectSocket()`, `disconnectSocket()`, `getSocket()`
- Client uses dynamic auth callback: `auth: (cb) => cb({ token: getAccessToken() })` so reconnections use fresh tokens
- Transport: websocket-only (`transports: ['websocket']`)
- `useSocket` hook wires up all event listeners and updates stores

### WebRTC Voice
- Full mesh P2P. Signaling via Socket.IO relay.
- `voiceManager.ts` orchestrates join/leave lifecycle, handles socket reconnection (re-joins voice + re-creates peer connections)
- `webrtc.ts` manages RTCPeerConnection map, SDP exchange, ICE candidates
- **ICE candidate buffering**: candidates arriving before `setRemoteDescription` are queued in `pendingCandidates` map and flushed after remote description is set (fixes async race condition that caused ~20s connection failures)
- `fetchIceConfig()` fetches STUN/TURN config from `/api/config/ice`, caches it, falls back to Google STUN
- `audioEngine.ts` manages Web Audio API pipeline: per-user GainNode + AnalyserNode for VAD
- Audio playback via `<audio>` elements (not routed through AudioContext destination)
- VAD: AnalyserNode.getByteFrequencyData() averaged, threshold=15, interval=100ms
- WebRTC debug logging via console.log only (no server-side emission)

### State Management (Zustand)
- `authStore`: user, isAuthenticated, isLoading, login/register/logout/refresh
- `serverStore`: servers[], activeServerId, activeServer (with members+channels), CRUD actions
- `channelStore`: channels[], activeChannelId, activeChannel, setChannels/setActiveChannel/create/delete
- `messageStore`: messagesByChannel{}, hasMore{}, typingUsers{}, fetchMessages/addMessage/setTyping/clearTyping
- `voiceStore`: channelId, isMuted, isDeafened, participants[], speaking Set, setters for all
- `audioStore`: inputDeviceId, outputDeviceId, inputVolume, masterVolume (persisted to localStorage key 'homestead-audio')
- `uiStore`: showCreateServer, showInviteModal, showCreateChannel, showSettings (boolean flags)

## API Routes
### Auth (rate limited 10/15min)
- POST `/api/auth/register` - body: {username, password, invite_code, display_name?} — invite-only, auto-joins server
- POST `/api/auth/login` - body: {username, password}
- POST `/api/auth/refresh` - reads cookie, verifies token_version
- POST `/api/auth/logout` - clears cookie, increments token_version (revokes all refresh tokens)

### Servers
- GET/POST `/api/servers` - list / create {name}
- GET/PATCH/DELETE `/api/servers/:id` - get(+members+channels) / update / delete(owner only)
- POST `/api/servers/join` - body: {invite_code}
- POST `/api/servers/:id/invite` - regenerate invite(owner/admin)

### Channels
- GET/POST `/api/servers/:serverId/channels` - list / create {name, type}
- PATCH/DELETE `/api/servers/:serverId/channels/:id` - update / delete (owner/admin)

### Messages
- GET `/api/channels/:channelId/messages?before=uuid&limit=50` - paginated, returns {messages[], hasMore}
- PATCH `/api/channels/:channelId/messages/:id` - edit (author only)
- DELETE `/api/channels/:channelId/messages/:id` - delete (author only)

### Users
- GET/PATCH `/api/users/me` - profile get/update
- PATCH `/api/users/me/password` - change password {currentPassword, newPassword}
- GET `/api/users/online` - list of online user IDs

### Config
- GET `/api/config/ice` - ICE server config (STUN + optional TURN)

## Socket Events
### Client → Server
- `channel:join(channelId)`, `channel:leave(channelId)`
- `message:send({channelId, content})`, `message:typing(channelId)`
- `voice:join(channelId)`, `voice:leave()`
- `voice:offer({to, offer})`, `voice:answer({to, answer})`, `voice:ice-candidate({to, candidate})`
### Server → Client
- `message:new(message)`, `message:typing({channelId, userId, username})`
- `user:online(userId)`, `user:offline(userId)`
- `voice:user-joined({userId, username, channelId})`, `voice:user-left({userId, channelId})`
- `voice:participants({channelId, participants[]})` - sent to joiner only
- `voice:offer({from, offer})`, `voice:answer({from, answer})`, `voice:ice-candidate({from, candidate})`

## Server-Side Voice State
- `voiceRooms: Map<channelId, Map<userId, {userId, username, socketId}>>` in voiceHandler.ts
- Presence: presenceHandler.ts updates users.status column on connect/disconnect, emits user:online/offline

## Type Definitions (client/src/types/)
### models.ts
- User: {id, username, display_name, avatar_url, status, created_at}
- Server: {id, name, icon_url, owner_id, invite_code, created_at}
- Channel: {id, server_id, name, type, position, created_at}
- Message: {id, channel_id, author_id, content, edited_at, created_at, author?: User}
- ServerMember: {id, user_id, server_id, role, joined_at, user?: User}

### api.ts
- AuthResponse: {user, accessToken}
- RegisterRequest, LoginRequest, CreateServerRequest, CreateChannelRequest, JoinServerRequest, UpdateProfileRequest
- MessagesResponse: {messages, hasMore}
- ServerWithMembers: Server + {members, channels}

### socket.ts
- ServerToClientEvents, ClientToServerEvents interfaces
- VoiceParticipant: {userId, username}

### voice.ts
- PeerConnection, AudioNode, VoiceState, AudioPreferences interfaces

## Middleware
- `auth.ts`: requireAuth - verifies Bearer JWT, sets req.user = {userId, username}
- `errorHandler.ts`: AppError class (statusCode, message), catch-all handler
- `validate.ts`: validate(zodSchema) middleware for req.body
- `rateLimiter.ts`: authLimiter (10 req/15min for auth routes), apiLimiter (100 req/min for all API routes)

## Security
- **Rate limiting**: express-rate-limit on all API routes (100/min general, 10/15min auth). Socket.IO chat messages rate-limited (5/5s sliding window), typing events throttled (3s).
- **Input validation**: Zod schemas on all mutating endpoints (auth, user profile, password change, message edit). Socket events validated for type + length.
- **Mass assignment prevention**: explicit field whitelisting in updateProfile (only display_name, avatar_url allowed). User input sanitized with sanitize-html.
- **Socket membership checks**: all chat and voice socket events verify channel membership (channel → server → server_members lookup) before processing. Prevents eavesdropping/injection.
- **Body size limit**: express.json limited to 16kb. Message content limited to 4000 chars.
- **Error boundary**: stack traces hidden in production builds (only shown in development via import.meta.env.DEV).
- **Nginx security headers**: HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy restrictive, server_tokens off.
- **TURN server**: denied-peer-ip for private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), restricted relay port range (49152-49200).

## Commands
### Dev
- `docker compose up` - start PostgreSQL
- `cd server && npm run dev` - start Express (tsx watch)
- `cd client && npm run dev` - start Vite dev server (HTTPS on :5173)
- `cd server && npx knex migrate:latest --knexfile src/config/knexfile.ts` - run migrations

### Production
- `docker compose -f docker-compose.prod.yml up -d --build` - build and start full stack
- `docker compose -f docker-compose.prod.yml logs server -f` - follow server logs
- `docker compose -f docker-compose.prod.yml down` - stop all containers
- `docker compose -f docker-compose.prod.yml up -d --build nginx` - rebuild only nginx (includes client)
- `docker compose -f docker-compose.prod.yml --profile turn up -d` - start with TURN server
- `./init-ssl.sh` - first-time SSL certificate provisioning (requires DOMAIN + SSL_EMAIL in .env)
- `docker compose -f docker-compose.prod.yml run --rm certbot renew` - renew SSL certificates
- Production uses separate volume `prod_pgdata` (won't conflict with dev `pgdata`)
- Knex migrations use `loadExtensions: ['.js']` in production to ignore `.d.ts` files

## Implementation Status
### Complete (Phases 1-5: MVP)
- Auth (register, login, refresh, logout)
- Server CRUD + invite codes
- Channel CRUD (text + voice)
- Real-time text chat with markdown + typing indicators
- Message pagination
- WebRTC voice channels (full mesh)
- VAD speaking indicators
- Audio device selection + volume control

### Complete (Phase 7: Polish)
- Presence system: GET /users/online endpoint, presenceStore, member list in ChannelSidebar (online/offline groups)
- Message editing: hover edit button, PATCH endpoint, "Editing message" banner in MessageInput, (edited) tag
- Message deletion: hover delete button, DELETE endpoint, real-time removal via socket
- Socket events added: message:edit, message:delete
- Password change: PATCH /users/me/password, form in SettingsModal with validation

### Complete (Phase 8: Deployment)
- server/Dockerfile (multi-stage Node 22 Alpine, python3/make/g++ for bcrypt native module)
- client/Dockerfile (multi-stage Vite build + Nginx Alpine, kept for dev/standalone use)
- client/nginx.conf (SPA fallback, /api proxy, /socket.io WebSocket upgrade with 86400s timeouts, gzip, asset caching)
- docker-compose.prod.yml (postgres + server + nginx + certbot + coturn with profiles, separate prod_pgdata volume)
- GET /api/config/ice endpoint (dynamic ICE/TURN config, cached on client)
- webrtc.ts fetchIceConfig() replaces hardcoded STUN, voiceManager calls before peer connections
- Secure cookie auto-detected from request protocol (works on HTTP and HTTPS)
- Dynamic Socket.IO auth callback for reconnection with fresh tokens
- ICE candidate buffering in webrtc.ts (fixes async race between setRemoteDescription and addIceCandidate)
- .env.example updated with Docker + TURN vars
- DEPLOYMENT.md (quick start, config table, LAN/remote/TURN/SSL setup, troubleshooting)

### Complete (Phase 9: VPS + SSL Deployment)
- nginx/Dockerfile: multi-stage build — builds React app from client/ + serves via Nginx with SSL support
- nginx/nginx.conf: HTTP-only config with certbot challenge support (used before SSL certs exist)
- nginx/nginx-ssl.conf: HTTPS config with HTTP→HTTPS redirect, gzip, asset caching, proxy pass
- nginx/docker-entrypoint.sh: auto-selects HTTP or HTTPS config based on cert existence, uses envsubst for DOMAIN
- coturn/turnserver.conf: static TURN config (credentials passed via docker-compose command args from env)
- init-ssl.sh: first-time Let's Encrypt certificate provisioning script (starts HTTP, runs certbot, restarts nginx)
- docker-compose.prod.yml: replaced client service with nginx (multi-stage, ports 80+443, cert volumes) + certbot sidecar (ssl profile)
- coturn service updated: credentials via command args from TURN_USER/TURN_PASSWORD env vars (no hardcoded passwords)
- CORS_ORIGIN defaults to https://${DOMAIN:-localhost}
- New volumes: certbot_certs, certbot_webroot
- .env.example: added DOMAIN, SSL_EMAIL vars
- DEPLOYMENT.md: full VPS deployment guide (provision, DNS, SSL, renewal, cron job)

### Complete (Phase 10: Security Hardening)
- Invite-only registration (requires server invite_code, auto-joins server, no email)
- Rate limiting: express-rate-limit on auth (10/15min) + all API routes (100/min), socket chat rate limiting (5/5s), typing throttle (3s)
- Socket membership checks: all chat/voice events verify channel membership before processing
- Mass assignment prevention: explicit field whitelisting + sanitize-html on user profile updates
- Zod validation on user profile, password change, and message edit endpoints
- Refresh token revocation via token_version column (logout + password change invalidate all tokens)
- Timing-safe login (dummy bcrypt hash prevents user enumeration)
- Explicit JWT algorithm (HS256) prevents algorithm confusion attacks
- Body size limit (16kb), message length limit (4000 chars)
- ErrorBoundary hides stack traces in production
- Removed voice:debug socket event (was temporary debug logging)
- Migration 006_security_hardening: adds token_version column, makes email nullable

### Known Issues / Notes
- Voice: initial socket `transport close` disconnect can occur but reconnect handler recovers automatically
- useVoice.ts hook exists but is unused (dead code) — voiceManager.ts is the active voice implementation
- Duplicate voice:user-left / voice:participants listeners in both useSocket.ts and voiceManager.ts (harmless, second call is idempotent)

### New files (Phase 7-10)
- client/src/stores/presenceStore.ts
- server/src/routes/config.routes.ts
- server/src/middleware/rateLimiter.ts
- server/src/validators/user.schema.ts
- server/src/db/migrations/006_security_hardening.ts
- server/Dockerfile, server/.dockerignore
- client/Dockerfile, client/.dockerignore, client/nginx.conf
- nginx/Dockerfile, nginx/nginx.conf, nginx/nginx-ssl.conf, nginx/docker-entrypoint.sh
- coturn/turnserver.conf
- init-ssl.sh
- docker-compose.prod.yml
- DEPLOYMENT.md
