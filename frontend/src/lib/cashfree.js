/**
 * Shared Cashfree Drop-in Checkout helper. Both onboarding (first-time
 * payment) and the Subscription settings page (plan switch payment) use
 * this exact same flow, so success/failure/cancel behaviour never drifts
 * between the two.
 */
export function openCashfreeCheckout({
    paymentSessionId,
    mode = "sandbox",
    onSuccess,
    onFailure,
    onDismiss
  }) {
    if (!window.Cashfree) {
      onFailure?.(new Error("Payment gateway failed to load. Please refresh and try again."));
      return;
    }
  
    const cashfree = window.Cashfree({ mode: mode === "production" ? "production" : "sandbox" });
  
    cashfree
      .checkout({
        paymentSessionId,
        redirectTarget: "_modal"
      })
      .then((result) => {
        if (result?.error) {
          const message = result.error.message || "";
          if (message.toLowerCase().includes("closed") || message.toLowerCase().includes("cancel")) {
            onDismiss?.();
          } else {
            onFailure?.(new Error(message || "Payment failed"));
          }
          return;
        }
  
        if (result?.paymentDetails) {
          onSuccess?.();
        } else {
          onDismiss?.();
        }
      })
      .catch((err) => {
        onFailure?.(err instanceof Error ? err : new Error("Payment failed"));
      });
  }