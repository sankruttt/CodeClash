import mongoose from 'mongoose';

const testCaseSchema = new mongoose.Schema({
  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CodingProblem',
    required: true
  },
  input: {
    type: String,
    required: true
  },
  expectedOutput: {
    type: String,
    required: true
  },
  isSample: {
    type: Boolean,
    default: false  // false = hidden test case
  },
  weight: {
    type: Number,
    default: 1
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

testCaseSchema.index({ problemId: 1, order: 1 });

const TestCase = mongoose.model('TestCase', testCaseSchema);
export default TestCase;
