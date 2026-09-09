import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: true
  },
  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CodingProblem',
    required: true
  },
  code: {
    type: String,
    required: true
  },
  language: {
    type: String,
    enum: ['javascript', 'python', 'typescript', 'java'],
    required: true
  },
  status: {
    type: String,
    enum: ['Accepted', 'Wrong Answer', 'Compilation Error', 'Runtime Error', 'Timeout', 'Pending'],
    default: 'Pending'
  },
  passedTests: {
    type: Number,
    default: 0
  },
  totalTests: {
    type: Number,
    default: 0
  },
  executionTime: {
    type: Number,  // ms
    default: 0
  },
  memoryUsed: {
    type: Number,  // KB
    default: 0
  },
  testResults: [{
    testCaseId: { type: String },
    passed: Boolean,
    input: String,
    expectedOutput: String,
    actualOutput: String,
    error: String
  }],
  errorMessage: String,
  score: {
    type: Number,
    default: 0
  },
  timeFromStart: {
    type: Number,  // seconds from match start
    default: 0
  }
}, {
  timestamps: true
});

submissionSchema.index({ matchId: 1, userId: 1, problemId: 1 });

submissionSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    return ret;
  }
});

const Submission = mongoose.model('Submission', submissionSchema);
export default Submission;
