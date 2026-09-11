const User = require('../models/User');

/**
 * POST /api/auth/sync
 * Syncs Firebase user to MongoDB. Called after every login/signup.
 * Creates user if not exists, updates firebase_uid if email already exists.
 */
exports.syncUser = async (req, res, next) => {
  try {
    const { uid, email, name } = req.firebaseUser;

    // Try to find by firebase_uid first
    let user = await User.findOne({ firebase_uid: uid });

    if (!user) {
      // Check if user exists by email (email-first migration path)
      user = await User.findOne({ email });
      if (user) {
        // Existing user — attach firebase_uid
        user.firebase_uid = uid;
        if (!user.name || user.name.startsWith('Guest')) {
          user.name = name || user.name;
        }
        await user.save();
      } else {
        // New user — create
        user = await User.create({
          firebase_uid: uid,
          email,
          name: name || email.split('@')[0],
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        firebase_uid: user.firebase_uid,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      message: 'User synced successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Get current user profile from MongoDB
 */
exports.getMe = async (req, res, next) => {
  try {
    const { uid } = req.firebaseUser;
    const user = await User.findOne({ firebase_uid: uid }).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};
