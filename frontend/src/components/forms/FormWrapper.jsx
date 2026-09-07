import React from "react";

export default function FormWrapper({ onSubmit, children, className = "" }) {
  return (
    <form onSubmit={onSubmit} className={`space-y-4 ${className}`}>
      {children}
    </form>
  );
}