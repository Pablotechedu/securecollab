import mongoose from 'mongoose';

const membershipSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  role: { type: String, enum: ['project_admin', 'developer', 'viewer'], required: true },
}, { timestamps: true });

membershipSchema.index({ userId: 1, projectId: 1 }, { unique: true });

export default mongoose.model('Membership', membershipSchema);
