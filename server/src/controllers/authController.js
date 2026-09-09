import { registerUser, loginUser, getUserById } from '../services/authService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const register = asyncHandler(async (req, res) => {
  const { username, email, password, avatar } = req.body;
  
  const result = await registerUser({ username, email, password, avatar });
  
  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: result
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  const result = await loginUser({ email, password });
  
  res.json({
    success: true,
    message: 'Login successful',
    data: result
  });
});

export const getProfile = asyncHandler(async (req, res) => {
  const user = await getUserById(req.user.id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'USER_NOT_FOUND',
      message: 'User not found'
    });
  }
  
  res.json({
    success: true,
    data: { user }
  });
});

export default { register, login, getProfile };
