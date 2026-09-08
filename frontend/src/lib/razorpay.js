/**
 * Shared Razorpay Checkout helper. Both onboarding (first-time payment) and
 * the Subscription settings page (plan switch payment) use this exact same
 * flow, so success/failure/cancel behaviour never drifts between the two.
 */
export function openRazorpayCheckout({
    order,
    keyId,
    name = "In2Fest",
    description,
    onSuccess,
    onFailure,
    onDismiss
  }) {
    if (!window.Razorpay) {
      onFailure?.(new Error("Payment gateway failed to load. Please refresh and try again."));
      return;
    }
  
    const rzp = new window.Razorpay({
      key: keyId,
      amount: order.amount,
      currency: order.currency,
      name,
      description,
      order_id: order.id,
      handler: (response) => {
        onSuccess({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature
        });
      },
      modal: {
        ondismiss: () => {
          onDismiss?.();
        }
      },
      theme: { color: "#C1352B" }
    });
  
    rzp.on("payment.failed", (resp) => {
      onFailure?.(new Error(resp?.error?.description || "Payment failed"));
    });
  
    rzp.open();
  }