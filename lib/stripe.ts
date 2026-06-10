import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
  typescript: true,
});

export const formatAmountForStripe = (amount: number): number => {
  return Math.round(amount * 100);
};

export async function getOrCreateStripeCustomer(email: string, name?: string): Promise<string> {
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data.length > 0) return existing.data[0].id;
  const customer = await stripe.customers.create({ email, ...(name ? { name } : {}) });
  return customer.id;
}
