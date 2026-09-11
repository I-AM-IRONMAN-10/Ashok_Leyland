/**
 * Centralized API & WebSocket Client for Ashok Leyland WMS Frontend
 * Provides unified REST methods & live WebSocket connection with graceful offline fallback.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

function getWsBaseUrl() {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  if (typeof window !== 'undefined' && window.location && window.location.host) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }
  return 'ws://localhost:8000/ws';
}

export async function fetchWarehouseMap() {
  try {
    const res = await fetch(`${API_BASE_URL}/warehouse/map`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn("[API] fetchWarehouseMap offline fallback:", err.message);
    return null;
  }
}

export async function scanEngineBarcode(barcode) {
  try {
    const res = await fetch(`${API_BASE_URL}/placement/scan-engine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ engine_barcode: barcode })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[API] scanEngineBarcode offline fallback:", err.message);
    return null;
  }
}

export async function confirmPlacement(barcode, locCode, operatorName) {
  try {
    const res = await fetch(`${API_BASE_URL}/placement/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        engine_barcode: barcode,
        location_code: locCode,
        operator_name: operatorName || 'Operator (Ramesh)'
      })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.detail || `Server error ${res.status}` };
    }
    return await res.json();
  } catch (err) {
    console.warn("[API] confirmPlacement offline fallback:", err.message);
    return { offline: true };
  }
}

export async function solveRetrievalPlan(targetLocCode, dispatchBay = 'DISPATCH_BAY_NORTH') {
  try {
    const res = await fetch(`${API_BASE_URL}/retrieval/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_loc_code: targetLocCode, dispatch_bay: dispatchBay })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[API] solveRetrievalPlan offline fallback:", err.message);
    return null;
  }
}

export async function executeRetrievalStep(stepNumber, barcode, fromLoc, toLoc, operatorName) {
  try {
    const res = await fetch(`${API_BASE_URL}/retrieval/execute-step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        step_number: stepNumber,
        engine_barcode: barcode,
        from_location: fromLoc,
        to_location: toLoc,
        operator_name: operatorName || 'Floor Lifter (Operator)'
      })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[API] executeRetrievalStep offline fallback:", err.message);
    return { offline: true };
  }
}

export async function fetchAnalyticsSummary() {
  try {
    const res = await fetch(`${API_BASE_URL}/analytics/summary`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[API] fetchAnalyticsSummary offline fallback:", err.message);
    return null;
  }
}

export async function fetchReallocationAnalysis() {
  try {
    const res = await fetch(`${API_BASE_URL}/reallocation/analyze`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[API] fetchReallocationAnalysis offline fallback:", err.message);
    return null;
  }
}

export async function executeReallocationMove(engineNumber, fromLoc, toLoc) {
  try {
    const res = await fetch(`${API_BASE_URL}/reallocation/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        engine_number: engineNumber,
        from_location: fromLoc,
        to_location: toLoc
      })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[API] executeReallocationMove offline fallback:", err.message);
    return { offline: true };
  }
}

export function subscribeWarehouseWebSocket(onGridUpdate) {
  let ws = null;
  let isClosedIntentionally = false;

  function connect() {
    try {
      ws = new WebSocket(getWsBaseUrl());
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type === 'GRID_UPDATE' && data.grid && onGridUpdate) {
            onGridUpdate(data.grid);
          }
        } catch (e) {
          // ignore non-json messages
        }
      };

      ws.onclose = () => {
        if (!isClosedIntentionally) {
          setTimeout(connect, 5000); // Attempt reconnect every 5s
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.warn("[WS] Could not connect to WebSocket:", e.message);
    }
  }

  connect();

  return () => {
    isClosedIntentionally = true;
    if (ws) ws.close();
  };
}
