import CodingProblem from '../models/CodingProblem.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// Normalize problem data to have consistent 'id' field
function normalizeProblem(problem) {
  if (!problem) return null;
  const obj = problem.toObject ? problem.toObject() : problem;
  return {
    ...obj,
    id: String(obj._id || obj.id)
  };
}

export const getAllProblems = asyncHandler(async (req, res) => {
  const { difficulty, tags, limit = 50 } = req.query;
  const query = { isActive: true };

  if (difficulty) query.difficulty = difficulty;
  if (tags) query.tags = { $in: tags.split(',') };

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const problemsDocs = await CodingProblem.find(query).limit(safeLimit);
  const problems = problemsDocs.map(normalizeProblem);

  res.json({
    success: true,
    data: { problems, count: problems.length }
  });
});

export const getProblem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let problem;
  // Try to find by _id (ObjectId format)
  if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
    problem = await CodingProblem.findById(id);
  } else {
    // Try by title or other identifier
    problem = await CodingProblem.findOne({ title: id });
  }

  problem = normalizeProblem(problem);

  if (!problem) {
    return res.status(404).json({
      success: false,
      error: 'PROBLEM_NOT_FOUND',
      message: 'Problem not found'
    });
  }

  res.json({
    success: true,
    data: { problem }
  });
});

export const getRandomProblems = asyncHandler(async (req, res) => {
  const count = Math.min(Math.max(parseInt(req.query.count, 10) || 3, 1), 10);
  const { difficulty } = req.query;

  const matchStage = { isActive: true };
  if (difficulty && ['Easy', 'Medium', 'Hard'].includes(difficulty)) {
    matchStage.difficulty = difficulty;
  }

  const problemsDocs = await CodingProblem.aggregate([
    { $match: matchStage },
    { $sample: { size: count } }
  ]);
  const problems = problemsDocs.map(normalizeProblem);

  res.json({
    success: true,
    data: { problems }
  });
});

export default { getAllProblems, getProblem, getRandomProblems };
