import mongoose from 'mongoose';

const codingProblemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  constraints: [{
    type: String
  }],
  examples: [{
    input: String,
    output: String,
    explanation: String
  }],
  starterCode: {
    javascript: { type: String, default: '' },
    python: { type: String, default: '' },
    typescript: { type: String, default: '' },
    java: { type: String, default: '' }
  },
  tags: [{
    type: String
  }],
  timeLimit: {
    type: Number,  // seconds
    default: 60
  },
  memoryLimit: {
    type: Number,  // MB
    default: 256
  },
  points: {
    type: Number,
    default: 100
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

codingProblemSchema.index({ difficulty: 1, tags: 1 });

const CodingProblem = mongoose.model('CodingProblem', codingProblemSchema);
export default CodingProblem;
