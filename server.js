require('dotenv').config();
const express = require('express');
const path = require('path');
const Stripe = require('stripe');
const app = express();
const PORT = process.env.PORT || 4242;
const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://www.takincatering.com';
const CURRENCY = (process.env.CURRENCY || 'gbp').toLowerCase();
const BUSINESS_NAME = process.env.BUSINESS_NAME || 'Takin Catering';
const stripe = process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('replace_me') ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET && !process.env.STRIPE_WEBHOOK_SECRET.includes('replace_me') ? process.env.STRIPE_WEBHOOK_SECRET : null;

const PRODUCTS = {
  'jollof-rice-tray': { name:'Jollof Rice Tray', description:'Serves 10–12. Classic party jollof rice.', unit_amount:7500, min:1, max:30 },
  'grilled-chicken-platter': { name:'Grilled Chicken Platter', description:'Serves 8–10. Marinated grilled chicken pieces.', unit_amount:10000, min:1, max:30 },
  'party-package': { name:'Party Package', description:'Per person. Jollof rice, chicken, plantain and salad. Minimum 20 people.', unit_amount:1800, min:20, max:300 }
};

app.post('/api/stripe-webhook', express.raw({type:'application/json'}), (req,res)=>{
  if(!stripe || !webhookSecret) return res.status(503).send('Stripe webhook is not configured.');
  try {
    const event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], webhookSecret);
    if(event.type === 'checkout.session.completed') {
      const s=event.data.object;
      console.log('PAID ORDER',{sessionId:s.id,email:s.customer_details?.email,amountTotal:s.amount_total,currency:s.currency,metadata:s.metadata});
    }
    res.sendStatus(200);
  } catch(err) { console.error('Webhook verification failed:',err.message); res.status(400).send(`Webhook Error: ${err.message}`); }
});
app.use(express.json({limit:'100kb'}));
app.use(express.static(path.join(__dirname,'public')));
app.get('/api/config',(_req,res)=>res.json({businessName:BUSINESS_NAME,currency:CURRENCY,stripeConfigured:Boolean(stripe)}));
app.get('/api/session-status',async(req,res)=>{
  if(!stripe) return res.status(503).json({error:'Payments are not configured.'});
  const id=typeof req.query.session_id==='string'?req.query.session_id:'';
  if(!id.startsWith('cs_')) return res.status(400).json({error:'Invalid session.'});
  try { const s=await stripe.checkout.sessions.retrieve(id); res.json({payment_status:s.payment_status,customer_email:s.customer_details?.email||s.customer_email||null}); }
  catch { res.status(400).json({error:'Unable to verify payment session.'}); }
});
app.post('/api/create-checkout-session',async(req,res)=>{
  try {
    const {items,customer,event}=req.body||{};
    if(!Array.isArray(items)||!items.length) return res.status(400).json({error:'Your basket is empty.'});
    if(!stripe) return res.status(503).json({error:'Payments are not configured yet. Add STRIPE_SECRET_KEY to your environment.'});
    const line_items=items.map(item=>{
      const p=PRODUCTS[item.id]; if(!p) throw new Error('Invalid product selected.');
      const q=Math.max(p.min,Math.min(Number(item.quantity)||p.min,p.max));
      return {price_data:{currency:CURRENCY,product_data:{name:p.name,description:p.description},unit_amount:p.unit_amount},quantity:q};
    });
    const clean=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
    const session=await stripe.checkout.sessions.create({
      mode:'payment',line_items,customer_email:clean(customer?.email,200)||undefined,customer_creation:'always',phone_number_collection:{enabled:true},billing_address_collection:'required',
      metadata:{business:BUSINESS_NAME,contact_name:clean(customer?.name,120),event_date:clean(event?.date,20),event_type:clean(event?.type,80),delivery_postcode:clean(event?.postcode,20),notes:clean(event?.notes,500)},
      success_url:`${BASE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${BASE_URL}/?cancelled=1`
    });
    res.json({url:session.url});
  } catch(err) { console.error(err); res.status(500).json({error:err.message||'Unable to create checkout session.'}); }
});
app.get('/health',(_req,res)=>res.json({ok:true}));
app.listen(PORT,'0.0.0.0',()=>console.log(`${BUSINESS_NAME} running at ${BASE_URL}`));
