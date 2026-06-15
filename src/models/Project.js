import mongoose from 'mongoose';
import { encrypt, decrypt } from '../utils/encryption.js';

const projectMemberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['project_admin', 'developer', 'viewer'], required: true },
}, { _id: false });

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    set: (val) => encrypt(val),
    get: (val) => decrypt(val),
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  visibility: {
    type: String,
    enum: ['private', 'internal'],
    default: 'internal',
  },
  members: {
    type: [projectMemberSchema],
    default: [],
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  toJSON: { getters: true },
  toObject: { getters: true },
});

projectSchema.index({ orgId: 1 });

export default mongoose.model('Project', projectSchema);
