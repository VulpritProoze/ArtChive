# WebSocket Context Refactoring Plan

## Executive Summary

**Goal**: Combine `NotificationContext` and `FriendRequestContext` into a unified `WebSocketContext` that manages a single WebSocket connection while keeping business logic modular and optimized.

**Benefits**:
- Single WebSocket connection per user (reduced server load)
- Eliminated code duplication (~200 lines of duplicate connection management)
- Better resource efficiency
- Easier to maintain and extend
- Improved error handling and reconnection logic

---

## Current State Analysis

### Frontend Issues
1. **Duplicate Connection Management**: Both contexts have identical WebSocket connection logic (~150 lines duplicated)
2. **Two Separate Connections**: Each user maintains 2 WebSocket connections unnecessarily
3. **Inconsistent Error Handling**: Different error handling strategies
4. **Separate Reconnection Logic**: Duplicated reconnection attempts and timeouts
5. **No Connection Pooling**: Each context manages its own connection lifecycle

### Backend Structure
- **Separate Consumers**: `NotificationConsumer` and `FriendRequestConsumer`
- **Separate Routes**: `/ws/notifications/` and `/ws/friend-requests/`
- **Separate Channel Groups**: `notifications_{user_id}` and `friend_requests_{user_id}`

### Usage Patterns
- **Notifications**: Used in `NotificationDropdown`, `NotificationIndex`
- **Friend Requests**: Used implicitly via React Query invalidation (no direct hook usage in components)

---

## Proposed Architecture

### Option 1: Unified WebSocket Context (RECOMMENDED) ⭐

**Single WebSocket connection** that handles multiple message types with modular handlers.

```
┌─────────────────────────────────────┐
│     WebSocketContext                │
│  ┌──────────────────────────────┐  │
│  │  Single WebSocket Connection  │  │
│  │  /ws/realtime/                │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Message Router               │  │
│  │  - notification               │  │
│  │  - friend_request_update      │  │
│  │  - (future types)             │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Notification Handler         │  │
│  │  - State management           │  │
│  │  - Browser notifications     │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Friend Request Handler      │  │
│  │  - Query invalidation        │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Backend Changes Required**:
- Create unified `RealtimeConsumer` that joins both channel groups
- Single endpoint: `/ws/realtime/`
- Route messages to appropriate handlers

**Pros**:
- ✅ Single connection (most efficient)
- ✅ Centralized connection management
- ✅ Easy to add new message types
- ✅ Better error handling

**Cons**:
- ⚠️ Requires backend refactoring
- ⚠️ More complex initial implementation

---

### Option 2: Shared Connection Manager (Alternative)

Keep separate contexts but share connection management via a custom hook.

**Pros**:
- ✅ Minimal backend changes
- ✅ Gradual migration possible

**Cons**:
- ❌ Still two connections (less efficient)
- ❌ More complex architecture
- ❌ Doesn't solve the core problem

---

## Implementation Plan: Option 1 (Unified Context)

### Phase 1: Backend Refactoring

#### Step 1.1: Create Unified Consumer
**File**: `backend/core/consumers.py` (new unified consumer)

```python
class RealtimeConsumer(AsyncWebsocketConsumer):
    """
    Unified WebSocket consumer for all real-time updates.
    Handles notifications, friend requests, and future message types.
    """
    
    async def connect(self):
        self.user = self.scope['user']
        if self.user.is_anonymous:
            await self.close()
            return
        
        # Join both channel groups
        self.notification_group = f'notifications_{self.user.id}'
        self.friend_request_group = f'friend_requests_{self.user.id}'
        
        await self.channel_layer.group_add(
            self.notification_group,
            self.channel_name
        )
        await self.channel_layer.group_add(
            self.friend_request_group,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        if hasattr(self, 'notification_group'):
            await self.channel_layer.group_discard(
                self.notification_group,
                self.channel_name
            )
        if hasattr(self, 'friend_request_group'):
            await self.channel_layer.group_discard(
                self.friend_request_group,
                self.channel_name
            )
    
    async def notification_message(self, event):
        """Handle notification messages"""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification': event['notification']
        }))
    
    async def friend_request_update(self, event):
        """Handle friend request updates"""
        await self.send(text_data=json.dumps({
            'type': 'friend_request_update',
            'action': event['action'],
            'friend_request': event.get('friend_request'),
            'count': event.get('count'),
        }))
```

#### Step 1.2: Update Routing
**File**: `backend/core/routing.py`

```python
from .consumers import RealtimeConsumer

websocket_urlpatterns = [
    path('ws/realtime/', RealtimeConsumer.as_asgi()),
]
```

#### Step 1.3: Update ASGI Configuration
**File**: `backend/artchive/asgi.py`

- Remove `notification_routes` and `friend_request_routes`
- Add unified `realtime_routes`
- Keep old routes temporarily for backward compatibility during migration

#### Step 1.4: Deprecate Old Consumers
- Keep `NotificationConsumer` and `FriendRequestConsumer` temporarily
- Add deprecation warnings
- Remove after frontend migration complete

---

### Phase 2: Frontend Refactoring

#### Step 2.1: Create Unified WebSocket Context
**File**: `frontend/src/context/realtime-context.tsx` (NEW)

**Structure**:
```typescript
interface RealtimeContextType {
  // Connection status
  isConnected: boolean;
  
  // Notification features
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  
  // Friend request features (implicit via React Query)
  // No direct API needed - handled via query invalidation
  
  // Connection management
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
}
```

**Key Optimizations**:
1. **Single Connection**: One WebSocket to `/ws/realtime/`
2. **Message Router**: Route messages by `type` field
3. **Optimistic Updates**: Update state immediately, sync with server
4. **Connection Pooling**: Reuse connection across components
5. **Smart Reconnection**: Exponential backoff with jitter
6. **Connection Health**: Ping/pong for connection monitoring
7. **Message Queue**: Queue messages during reconnection

#### Step 2.2: Extract Connection Manager
**File**: `frontend/src/hooks/use-websocket.ts` (NEW)

Shared hook for WebSocket connection management:
- Connection lifecycle
- Reconnection logic
- Error handling
- Message routing

#### Step 2.3: Create Message Handlers
**Files**: 
- `frontend/src/context/handlers/notification-handler.ts`
- `frontend/src/context/handlers/friend-request-handler.ts`

Separate business logic from connection management.

#### Step 2.4: Update Components
**Files to Update**:
- `frontend/src/components/notifications/notification-dropdown.component.tsx`
- `frontend/src/components/notifications/index.component.tsx`
- `frontend/src/App.tsx` (replace providers)

**Changes**:
- Replace `useNotifications()` with `useRealtime()` (or keep `useNotifications` as alias)
- Remove `FriendRequestProvider` from App.tsx
- Update imports

#### Step 2.5: Update Types
**File**: `frontend/src/types/notification.ts`

Add `Friend Request Accepted` to notification types:
```typescript
notification_object_type: 
  | 'Post Comment' 
  | 'Post Critique' 
  | 'Post Praise' 
  | 'Post Trophy'
  | 'Friend Request Accepted';
```

---

### Phase 3: Optimization Enhancements

#### 3.1: Connection Health Monitoring
- Implement ping/pong heartbeat
- Detect stale connections
- Auto-reconnect on connection loss

#### 3.2: Message Batching
- Batch multiple updates in single message
- Reduce WebSocket message overhead

#### 3.3: Offline Support
- Queue messages when offline
- Sync when connection restored
- Show connection status indicator

#### 3.4: Performance Optimizations
- Memoize handlers with `useCallback`
- Debounce rapid updates
- Virtualize notification list for large datasets
- Lazy load notification history

#### 3.5: Error Recovery
- Retry failed operations
- Graceful degradation
- User-friendly error messages

---

## Migration Strategy

### Step-by-Step Migration

1. **Week 1: Backend Preparation**
   - ✅ Create unified consumer
   - ✅ Add new route alongside old routes
   - ✅ Test backend with both endpoints
   - ✅ Deploy backend changes

2. **Week 2: Frontend Implementation**
   - ✅ Create new `RealtimeContext`
   - ✅ Implement alongside old contexts
   - ✅ Test with feature flag
   - ✅ Gradually migrate components

3. **Week 3: Migration & Testing**
   - ✅ Migrate notification components
   - ✅ Remove friend request context
   - ✅ Update App.tsx
   - ✅ Comprehensive testing

4. **Week 4: Cleanup**
   - ✅ Remove old backend consumers
   - ✅ Remove old frontend contexts
   - ✅ Update documentation
   - ✅ Monitor for issues

### Feature Flag Approach

```typescript
const USE_UNIFIED_WEBSOCKET = import.meta.env.VITE_USE_UNIFIED_WS === 'true';

// In App.tsx
{USE_UNIFIED_WEBSOCKET ? (
  <RealtimeProvider>
    {children}
  </RealtimeProvider>
) : (
  <>
    <NotificationProvider>
      <FriendRequestProvider>
        {children}
      </FriendRequestProvider>
    </NotificationProvider>
  </>
)}
```

---

## File Structure

### New Files
```
frontend/src/
├── context/
│   ├── realtime-context.tsx          # Unified WebSocket context
│   ├── handlers/
│   │   ├── notification-handler.ts  # Notification business logic
│   │   └── friend-request-handler.ts # Friend request business logic
│   └── notification-context.tsx     # DEPRECATED (keep for migration)
│   └── friend-request-context.tsx   # DEPRECATED (keep for migration)
├── hooks/
│   └── use-websocket.ts              # Shared WebSocket connection hook
└── types/
    └── realtime.ts                    # Realtime message types

backend/
├── core/
│   ├── consumers.py                   # Unified RealtimeConsumer
│   └── routing.py                     # Updated routes
└── notification/
    └── consumers.py                   # DEPRECATED (keep for migration)
```

---

## Testing Checklist

### Backend Tests
- [ ] Unified consumer connects successfully
- [ ] Joins both channel groups
- [ ] Receives notification messages
- [ ] Receives friend request messages
- [ ] Handles disconnection gracefully
- [ ] Handles authentication failures

### Frontend Tests
- [ ] Single WebSocket connection established
- [ ] Notifications received and displayed
- [ ] Friend request updates invalidate queries
- [ ] Reconnection works after disconnect
- [ ] Error handling works correctly
- [ ] Browser notifications work
- [ ] Connection status indicator works
- [ ] No memory leaks on unmount

### Integration Tests
- [ ] End-to-end notification flow
- [ ] End-to-end friend request flow
- [ ] Multiple tabs/windows support
- [ ] Network interruption recovery
- [ ] Server restart recovery

---

## Performance Metrics

### Before Refactoring
- **Connections per user**: 2
- **Code duplication**: ~200 lines
- **Reconnection attempts**: 2 separate (can conflict)
- **Memory usage**: 2x WebSocket objects

### After Refactoring
- **Connections per user**: 1 (50% reduction)
- **Code duplication**: 0 lines
- **Reconnection attempts**: 1 unified (better coordination)
- **Memory usage**: 1x WebSocket object (50% reduction)

### Expected Improvements
- **Server load**: ~50% reduction in WebSocket connections
- **Client memory**: ~50% reduction
- **Code maintainability**: Significantly improved
- **Error handling**: More consistent and robust

---

## Risk Assessment

### Low Risk ✅
- Backend consumer refactoring (well-tested pattern)
- Frontend context combination (React patterns)
- Message routing (simple type checking)

### Medium Risk ⚠️
- Migration of existing components (requires testing)
- Backward compatibility during migration
- Connection state management

### Mitigation Strategies
1. **Feature flags** for gradual rollout
2. **Parallel running** of old and new systems
3. **Comprehensive testing** before full migration
4. **Rollback plan** if issues arise
5. **Monitoring** during migration period

---

## Success Criteria

### Must Have
- ✅ Single WebSocket connection per user
- ✅ All notifications work correctly
- ✅ Friend request updates work correctly
- ✅ No performance regression
- ✅ No breaking changes to component APIs

### Nice to Have
- ✅ Connection health monitoring
- ✅ Offline message queue
- ✅ Message batching
- ✅ Better error messages

---

## Timeline Estimate

- **Backend refactoring**: 2-3 days
- **Frontend implementation**: 3-4 days
- **Testing & migration**: 2-3 days
- **Cleanup & documentation**: 1-2 days

**Total**: ~2 weeks

---

## Next Steps

1. **Review this plan** with the team
2. **Approve architecture** decision
3. **Create feature branch**: `refactor/unified-websocket`
4. **Start with backend** (Phase 1)
5. **Implement frontend** (Phase 2)
6. **Test thoroughly** (Phase 3)
7. **Deploy gradually** with feature flags
8. **Monitor and iterate**

---

## Questions to Consider

1. Should we support multiple tabs/windows with shared state?
2. Do we need message persistence/queueing?
3. Should we add connection quality metrics?
4. Do we want to support other real-time features (e.g., live chat)?
5. Should we implement message compression for large payloads?

---

## References

- [Django Channels Documentation](https://channels.readthedocs.io/)
- [React Context Best Practices](https://react.dev/reference/react/useContext)
- [WebSocket Best Practices](https://www.websocket.org/echo.html)

