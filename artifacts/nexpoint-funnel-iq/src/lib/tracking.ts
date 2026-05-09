import { EventInputEventType } from "@workspace/api-client-react";
import { getStoredCustomerId } from "./auth";

export const getSessionId = () => {
  let sessionId = localStorage.getItem('hm_session');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('hm_session', sessionId);
  }
  return sessionId;
};

export const trackFunnelEvent = async (
  eventType: EventInputEventType,
  metadata?: string,
  productId?: number,
  customerId?: number
) => {
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventType,
        sessionId: getSessionId(),
        metadata,
        productId,
        customerId: customerId ?? getStoredCustomerId() ?? undefined,
      }),
    });
  } catch (error) {
    console.error("Failed to track event:", error);
  }
};
