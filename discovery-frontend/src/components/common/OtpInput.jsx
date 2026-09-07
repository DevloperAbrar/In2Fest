import React, { useRef, useEffect } from "react";

/**
 * OtpInput  - 6-box OTP input with auto-focus and backspace support.
 *
 * Props:
 *   value  : string   - current OTP string (e.g. "123456")
 *   onChange: (str) => void  - called with the full OTP string on every keystroke
 *   length : number   - defaults to 6
 *   disabled: bool
 */
export default function OtpInput({ value = "", onChange, length = 6, disabled = false }) {
  const inputsRef = useRef([]);

  // Split the string value into an array of characters
  const digits = value.split("").concat(Array(length).fill("")).slice(0, length);

  const focusAt = (index) => {
    const el = inputsRef.current[index];
    if (el) el.focus();
  };

  // Auto-focus first box on mount
  useEffect(() => {
    focusAt(0);
  }, []);

  const handleChange = (e, index) => {
    const raw = e.target.value.replace(/\D/g, ""); // digits only
    if (!raw) return;

    // Handle paste  - user pastes full OTP into any box
    if (raw.length > 1) {
      const pasted = raw.slice(0, length);
      onChange(pasted);
      focusAt(Math.min(pasted.length, length - 1));
      return;
    }

    // Single digit typed
    const newDigits = [...digits];
    newDigits[index] = raw[0];
    onChange(newDigits.join(""));
    if (index < length - 1) focusAt(index + 1);
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const newDigits = [...digits];
      if (newDigits[index]) {
        // Clear current box
        newDigits[index] = "";
        onChange(newDigits.join(""));
      } else if (index > 0) {
        // Move to previous and clear it
        newDigits[index - 1] = "";
        onChange(newDigits.join(""));
        focusAt(index - 1);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      focusAt(index - 1);
    } else if (e.key === "ArrowRight" && index < length - 1) {
      focusAt(index + 1);
    }
  };

  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ""}
          disabled={disabled}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onFocus={(e) => e.target.select()}
          className={[
            "w-10 h-12 text-center text-lg font-semibold border rounded-lg outline-none transition-all",
            digits[i]
              ? "border-primary-500 bg-primary-50 text-primary-700"
              : "border-gray-300 bg-white text-gray-800",
            "focus:border-primary-500 focus:ring-2 focus:ring-primary-100",
            disabled ? "opacity-50 cursor-not-allowed" : "",
          ].join(" ")}
        />
      ))}
    </div>
  );
}