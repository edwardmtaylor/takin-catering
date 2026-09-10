# Takin Catering — ready-to-deploy website

Personalised storefront for https://www.takincatering.com with Stripe Checkout.

## Business details built in
- Email: hello@takincatering.com
- WhatsApp only: 07424 926343
- Response hours: 10:00–18:00
- Delivery: nationwide across the UK; delivery arrangements/fees confirmed per order
- Order requirements, notice periods, deposits and cancellation terms: confirmed per order

## Menu built in
- Jollof Rice Tray — £75 — serves 10–12
- Grilled Chicken Platter — £100 — serves 8–10
- Party Package — £18/person — minimum 20 people

## Local test
1. Install Node.js 18+.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and add a Stripe TEST secret key.
4. Run `npm start`.
5. Visit `http://localhost:4242`.

## Render deployment
Create a Render Web Service from this repository.
- Build command: `npm install`
- Start command: `npm start`
- Health check: `/health`
- Add the environment variables from `.env.example` in Render (never commit real secrets).
- Add `www.takincatering.com` and `takincatering.com` under Render Custom Domains and follow Render's DNS instructions.

## Stripe
Set `STRIPE_SECRET_KEY` in Render. After the live domain works, create a Stripe webhook endpoint at:
`https://www.takincatering.com/api/stripe-webhook`
Subscribe to `checkout.session.completed`, then copy its signing secret into `STRIPE_WEBHOOK_SECRET` in Render.

Test the full checkout in Stripe test mode before switching to live keys.

## Important launch note
The site states that nationwide delivery arrangements/fees and order-specific requirements are confirmed per order. If you want to charge delivery automatically at checkout later, add a delivery-rate/postcode policy before launch.
