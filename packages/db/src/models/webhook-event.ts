import mongoose, { type Model } from 'mongoose';
const { model, models, Schema } = mongoose;

export type WebhookEventDoc = {
  provider: 'stripe' | 'paybridge';
  eventId: string;
  type: string;
  createdAt: Date;
};

const webhookEventSchema = new Schema<WebhookEventDoc>(
  {
    provider: { type: String, enum: ['stripe', 'paybridge'], required: true },
    eventId: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

// The unique pair is the first line of defence against replaying a signed event.
webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

export const WebhookEvent =
  (models.WebhookEvent as Model<WebhookEventDoc> | undefined) ?? model<WebhookEventDoc>('WebhookEvent', webhookEventSchema);
