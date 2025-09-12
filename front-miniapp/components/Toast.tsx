"use client";
import { useEffect } from "react";

export default function Toast({
  show, type = "info", message, onClose
}: { show: boolean; type?: "info"|"success"|"error"; message: string; onClose: ()=>void; }) {
  useEffect(() => { if (show) { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); } }, [show]);
  if (!show) return null;
  const color = type === "success" ? "bg-green-600" : type === "error" ? "bg-red-600" : "bg-gray-900";
  return (
    <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 text-white rounded-xl shadow-soft ${color}`}>
      {message}
    </div>
  );
}
