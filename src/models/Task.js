import mongoose from 'mongoose';
import { encrypt, decrypt } from '../utils/encryption.js';

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    trim: true,
    get: (val) => decrypt(val),
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  assigneeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['backlog', 'in_progress', 'review', 'done'],
    default: 'backlog',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  sensitive: {
    type: Boolean,
    default: false,
  },
  dueDate: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  toJSON: { getters: true },
  toObject: { getters: true },
});

taskSchema.index({ projectId: 1 });
taskSchema.index({ assigneeId: 1 });

taskSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  // Use _doc to read the raw stored value, bypassing the getter, to avoid double-encryption
  const raw = this._doc.description;
  if (this.sensitive && raw && !raw.startsWith('ENC:')) {
    this._doc.description = encrypt(raw);
  }
  next();
});

export default mongoose.model('Task', taskSchema);
