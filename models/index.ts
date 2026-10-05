import mongoose, { Schema } from "mongoose";
const userSchema = new Schema(
  { name: { type: String, required: true, trim: true, maxlength: 80 } },
  { timestamps: { createdAt: true, updatedAt: false } },
);
const listSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isArchived: { type: Boolean, default: false },
    ownerKeyHash: { type: String, select: false },
    accessCodeHash: { type: String, select: false },
    accessCodeEncrypted: { type: String, select: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
const itemSchema = new Schema(
  {
    listId: {
      type: Schema.Types.ObjectId,
      ref: "List",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    quantity: { type: String, default: "1", maxlength: 60 },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
      default: "Other",
    },
    status: {
      type: String,
      enum: ["YET_TO_BUY", "BOUGHT"],
      default: "YET_TO_BUY",
    },
    estimatedPrice: { type: Number, min: 0 },
    addedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    boughtBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    buyLocation: { type: Date, default: null },
    isRecurring: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
export const UserModel =
  mongoose.models.User || mongoose.model("User", userSchema);
export const ListModel =
  mongoose.models.List || mongoose.model("List", listSchema);
export const ItemModel =
  mongoose.models.ShoppingItem || mongoose.model("ShoppingItem", itemSchema);

const sessionSchema = new Schema({
  listId: { type: Schema.Types.ObjectId, required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});
const attemptSchema = new Schema({ _id: String, count: Number, expiresAt: { type: Date, expires: 0 } });
const claimSchema = new Schema({ _id: String, ownerTokenEncrypted: String, expiresAt: { type: Date, expires: 0 } });
export const ListSessionModel = mongoose.models.ListSession || mongoose.model('ListSession', sessionSchema);
export const AccessAttemptModel = mongoose.models.AccessAttempt || mongoose.model('AccessAttempt', attemptSchema);
export const OwnerClaimModel = mongoose.models.OwnerClaim || mongoose.model('OwnerClaim', claimSchema);
