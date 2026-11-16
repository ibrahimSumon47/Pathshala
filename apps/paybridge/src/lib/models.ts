import mongoose, { type Model, type Types } from 'mongoose';

const { model, models, Schema } = mongoose;

let connection: Promise<typeof mongoose> | null = null;

/** One cached connection per server process, using the gateway's own database when set. */
export async function connectGateway(): Promise<void> {
  const uri = process.env.PAYBRIDGE_MONGODB_URI ?? process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');
  connection ??= mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  await connection;
}

export type MerchantDoc = {
  name: string;
  slug: string;
  apiKeyHash: string;
  apiKeyPrefix: string;
  webhookSecret: string;
  createdAt: Date;
  updatedAt: Date;
};

const merchantSchema = new Schema<MerchantDoc>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    apiKeyHash: { type: String, required: true, unique: true },
    apiKeyPrefix: { type: String, required: true },
    webhookSecret: { type: String, required: true },
  },
  { timestamps: true },
);

export const Merchant = (models.PayBridgeMerchant as Model<MerchantDoc> | undefined) ?? model<MerchantDoc>('PayBridgeMerchant', merchantSchema);

export type CheckoutSessionDoc = {
  merchant: Types.ObjectId;
  orderRef: string;
  amountPaisa: number;
  currency: 'BDT';
  description: string;
  customerName: string;
  customerEmail: string;
  returnUrl: string;
  webhookUrl: string;
  status: 'pending' | 'paid' | 'refunded';
  cardLast4: string | null;
  paidAt: Date | null;
  refundedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const checkoutSessionSchema = new Schema<CheckoutSessionDoc>(
  {
    merchant: { type: Schema.Types.ObjectId, ref: 'PayBridgeMerchant', required: true },
    orderRef: { type: String, required: true, trim: true },
    amountPaisa: { type: Number, required: true, min: 1 },
    currency: { type: String, enum: ['BDT'], default: 'BDT' },
    description: { type: String, required: true, trim: true, maxlength: 200 },
    customerName: { type: String, required: true, trim: true, maxlength: 120 },
    customerEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    returnUrl: { type: String, required: true },
    webhookUrl: { type: String, required: true },
    status: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
    cardLast4: { type: String, default: null },
    paidAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// A retried create request for the same order must reuse the same checkout.
checkoutSessionSchema.index({ merchant: 1, orderRef: 1 }, { unique: true });
export const CheckoutSession =
  (models.PayBridgeCheckoutSession as Model<CheckoutSessionDoc> | undefined) ??
  model<CheckoutSessionDoc>('PayBridgeCheckoutSession', checkoutSessionSchema);

export type GatewayLedgerDoc = {
  merchant: Types.ObjectId;
  session: Types.ObjectId;
  type: 'charge' | 'refund';
  amountPaisa: number;
  description: string;
  createdAt: Date;
};

const gatewayLedgerSchema = new Schema<GatewayLedgerDoc>(
  {
    merchant: { type: Schema.Types.ObjectId, ref: 'PayBridgeMerchant', required: true },
    session: { type: Schema.Types.ObjectId, ref: 'PayBridgeCheckoutSession', required: true },
    type: { type: String, enum: ['charge', 'refund'], required: true },
    amountPaisa: { type: Number, required: true },
    description: { type: String, required: true, maxlength: 200 },
  },
  { timestamps: true },
);
gatewayLedgerSchema.index({ session: 1, type: 1 }, { unique: true });
export const GatewayLedger =
  (models.PayBridgeLedger as Model<GatewayLedgerDoc> | undefined) ?? model<GatewayLedgerDoc>('PayBridgeLedger', gatewayLedgerSchema);

export type DeliveryDoc = {
  merchant: Types.ObjectId;
  session: Types.ObjectId;
  event: string;
  url: string;
  payload: string;
  status: 'delivered' | 'failed';
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const deliverySchema = new Schema<DeliveryDoc>(
  {
    merchant: { type: Schema.Types.ObjectId, ref: 'PayBridgeMerchant', required: true },
    session: { type: Schema.Types.ObjectId, ref: 'PayBridgeCheckoutSession', required: true },
    event: { type: String, required: true },
    url: { type: String, required: true },
    payload: { type: String, required: true },
    status: { type: String, enum: ['delivered', 'failed'], default: 'failed' },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: null },
  },
  { timestamps: true },
);
deliverySchema.index({ session: 1, event: 1 }, { unique: true });
export const Delivery = (models.PayBridgeDelivery as Model<DeliveryDoc> | undefined) ?? model<DeliveryDoc>('PayBridgeDelivery', deliverySchema);

export type KeyRevealDoc = {
  merchant: Types.ObjectId;
  apiKey: string;
  createdAt: Date;
};

const keyRevealSchema = new Schema<KeyRevealDoc>(
  {
    merchant: { type: Schema.Types.ObjectId, ref: 'PayBridgeMerchant', required: true },
    apiKey: { type: String, required: true },
  },
  { timestamps: true },
);
keyRevealSchema.index({ createdAt: 1 }, { expireAfterSeconds: 900 });
export const KeyReveal = (models.PayBridgeKeyReveal as Model<KeyRevealDoc> | undefined) ?? model<KeyRevealDoc>('PayBridgeKeyReveal', keyRevealSchema);

export type MerchantRecord = MerchantDoc & { _id: Types.ObjectId };
export type CheckoutSessionRecord = CheckoutSessionDoc & { _id: Types.ObjectId };
export type DeliveryRecord = DeliveryDoc & { _id: Types.ObjectId };
export type KeyRevealRecord = KeyRevealDoc & { _id: Types.ObjectId };
export type GatewayLedgerRecord = GatewayLedgerDoc & { _id: Types.ObjectId };
