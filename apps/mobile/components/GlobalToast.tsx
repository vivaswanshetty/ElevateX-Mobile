import React from "react";
import { Toast } from "./Toast";
import { useToastStore } from "../stores/toastStore";

export function GlobalToast() {
  const { message, type, hideToast } = useToastStore();
  
  return (
    <Toast 
      message={message} 
      type={type} 
      onHide={hideToast} 
    />
  );
}