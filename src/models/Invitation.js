import mongoose from 'mongoose';

const invitationSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  inviteeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  inviteeEmail: { type: String, required: true, lowercase: true, trim: true },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['org_admin', 'member'], required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
}, { timestamps: true });

export default mongoose.model('Invitation', invitationSchema);
