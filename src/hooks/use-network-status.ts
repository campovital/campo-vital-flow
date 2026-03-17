import { useState, useEffect, useCallback, useRef } from "react";

type NetworkState = "online" | "slow" | "reconnecting" | "offline";

type ConnectionWithInfo = Navigator & {
  connection?: {
    effectiveType?: string;
    saveData?: boolean;
    addEventListener?: (type: "change", listener: () => void) => void;
    removeEventListener?: (type: "change", listener: () => void) => void;
  };
};

function detectSlowConnection() {
  if (typeof navigator === "undefined") return false;

  const connection = (navigator as ConnectionWithInfo).connection;
  if (!connection) return false;

  return Boolean(
    connection.saveData ||
      connection.effectiveType === "slow-2g" ||
      connection.effectiveType === "2g"
  );
}

/**
 * Detects online/offline status and exposes network quality info.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isSlowConnection, setIsSlowConnection] = useState<boolean>(
    detectSlowConnection()
  );
  const [isReconnecting, setIsReconnecting] = useState(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useCallback(() => {
    const online = typeof navigator !== "undefined" ? navigator.onLine : true;
    setIsOnline(online);
    setIsSlowConnection(detectSlowConnection());

    if (!online) {
      setIsReconnecting(false);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      return;
    }

    setIsReconnecting(true);
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectTimeoutRef.current = setTimeout(() => {
      setIsReconnecting(false);
    }, 4000);
  }, []);

  useEffect(() => {
    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    const connection = (navigator as ConnectionWithInfo).connection;
    connection?.addEventListener?.("change", update);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      connection?.removeEventListener?.("change", update);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [update]);

  const status: NetworkState = !isOnline
    ? "offline"
    : isReconnecting
      ? "reconnecting"
      : isSlowConnection
        ? "slow"
        : "online";

  return {
    isOnline,
    refresh: update,
    isSlowConnection,
    isReconnecting,
    status,
  };
}
