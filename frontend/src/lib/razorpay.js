// Lazily loads Razorpay's Checkout script (only once) and opens the payment modal.
// Real payments only — no mock/demo path. The actual charge and signature
// verification always happen server-side; this file only drives the widget.

let loadPromise = null;

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load the payment widget. Check your connection and try again."));
    document.body.appendChild(script);
  });
  return loadPromise;
}

/**
 * @param {object} order - the response from POST /bookings/{id}/pay/create-order
 * @param {(res: {razorpay_order_id, razorpay_payment_id, razorpay_signature}) => void} onSuccess
 * @param {(err?: Error) => void} onDismiss - called if the user closes the widget without paying
 */
export async function openRazorpayCheckout(order, onSuccess, onDismiss) {
  await loadRazorpayScript();
  const rzp = new window.Razorpay({
    key: order.key_id,
    amount: order.amount,
    currency: order.currency,
    order_id: order.order_id,
    name: order.name || "LKK",
    description: order.description || "",
    prefill: order.prefill || {},
    theme: { color: "#166534" }, // green-800, matches the app
    handler: (response) => {
      onSuccess({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });
    },
    modal: {
      ondismiss: () => onDismiss && onDismiss(),
    },
  });
  rzp.on("payment.failed", (response) => {
    onDismiss && onDismiss(new Error(response.error?.description || "Payment failed"));
  });
  rzp.open();
}
