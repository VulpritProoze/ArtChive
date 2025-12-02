import React, { createContext, useContext, useEffect, useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WS_BASE_URL } from '@lib/api';
import { useAuth } from './auth-context';

interface FriendRequestContextType {
  isConnected: boolean;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
}

const FriendRequestContext = createContext<FriendRequestContextType | undefined>(undefined);

export function FriendRequestProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectAttemptsRef = useRef(0);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [isConnected, setIsConnected] = useState(false);
  const maxReconnectAttempts = 5;
  const connectionTimeout = 10000; // 10 seconds timeout for handshake

  // Check if user is authenticated
  const isAuthenticated = !!user;

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    // Security: Only connect if user is authenticated
    if (!isAuthenticated || !user) {
      return;
    }

    // Don't create multiple connections
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(`${WS_BASE_URL}/ws/friend-requests/`);

      // Set timeout for connection handshake
      connectionTimeoutRef.current = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
        }
      }, connectionTimeout);

      ws.onopen = () => {
        // Clear connection timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = undefined;
        }

        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'friend_request_update') {
            // Invalidate friend request queries to trigger refetch
            queryClient.invalidateQueries({ queryKey: ['friend-request-count'] });
            queryClient.invalidateQueries({ queryKey: ['pending-friend-requests'] });
            queryClient.invalidateQueries({ queryKey: ['friend-request-status'] });
            queryClient.invalidateQueries({ queryKey: ['fellows'] });
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = (event) => {
        setIsConnected(false);

        // Clear connection timeout if still set
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = undefined;
        }

        // Attempt to reconnect if not a normal closure and we haven't exceeded max attempts
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.warn(
            'WebSocket: Maximum reconnection attempts reached. Connection will not retry.'
          );
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [isAuthenticated, user, queryClient]);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = undefined;
    }
    setIsConnected(false);
    reconnectAttemptsRef.current = 0;
  }, []);

  // Connect/disconnect based on authentication
  useEffect(() => {
    if (!isAuthenticated || !user) {
      disconnectWebSocket();
      return;
    }

    return () => {
      disconnectWebSocket();
    };
  }, [isAuthenticated, user, disconnectWebSocket]);

  // Separate effect for WebSocket - deferred to avoid blocking initial load
  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    // Defer WebSocket connection by 2 seconds to allow page to load first
    const connectTimeout = setTimeout(() => {
      connectWebSocket();
    }, 2000);

    return () => {
      clearTimeout(connectTimeout);
    };
  }, [isAuthenticated, user, connectWebSocket]);

  const value: FriendRequestContextType = {
    isConnected,
    connectWebSocket,
    disconnectWebSocket,
  };

  return (
    <FriendRequestContext.Provider value={value}>
      {children}
    </FriendRequestContext.Provider>
  );
}

export function useFriendRequests() {
  const context = useContext(FriendRequestContext);
  if (context === undefined) {
    throw new Error('useFriendRequests must be used within a FriendRequestProvider');
  }
  return context;
}

