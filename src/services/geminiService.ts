import { OBDData, Trip } from "../types";

export const processVoiceCommand = async (text: string, contextData?: { speed: number, rpm: number, isRecording: boolean, vehicleModel?: string }, history?: any[]) => {
  try {
    const res = await fetch("/api/gemini/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, contextData, history })
    });
    
    if (!res.ok) {
      return { text: "I'm sorry, I couldn't process that command. Please check your connection." };
    }

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return { text: "Service is currently unavailable. Please try again shortly." };
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.warn("Voice command processing failed:", error);
    return { text: "I'm sorry, I couldn't process that command. Please check your connection." };
  }
};

export const runAIDiagnosis = async (data: OBDData, sensorHistory?: { accel: number, gyro: number, timestamp: number }[], vehicleModel?: string) => {
  try {
    const res = await fetch("/api/gemini/diagnose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, sensorHistory, vehicleModel })
    });

    if (!res.ok) {
      return "AI Diagnosis is currently unavailable. Please check your vehicle connection and try again.";
    }

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return "AI Diagnosis is currently unavailable. Please try again shortly.";
    }

    const json = await res.json();
    return json.text || "AI Diagnosis is currently unavailable.";
  } catch (error) {
    console.warn("AI Diagnosis failed:", error);
    return "AI Diagnosis is currently unavailable. Please check your network connection.";
  }
};

export const fetchDTCDefinition = async (code: string) => {
  try {
    const res = await fetch("/api/gemini/dtc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });

    if (!res.ok) {
      return null;
    }

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return null;
    }

    const json = await res.json();
    return json.text || null;
  } catch (error) {
    console.warn("DTC Definition fetch failed:", error);
    return null; // Return null so we can fallback to local definitions if needed
  }
};

export const getRouteRecommendation = async (trips: Trip[]) => {
  try {
    const res = await fetch("/api/gemini/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trips })
    });

    if (!res.ok) {
      return "Route recommendations are currently unavailable.";
    }

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return "Route recommendations are currently unavailable.";
    }

    const json = await res.json();
    return json.text || "Route recommendations are currently unavailable.";
  } catch (error) {
    console.warn("Route recommendation failed:", error);
    return "Route recommendations are currently unavailable.";
  }
};

