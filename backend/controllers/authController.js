const User = require('../models/User');

/**
 * POST /api/auth/sync
 * Syncs Firebase user to MongoDB. Called after every login/signup.
 * Creates user if not exists, updates firebase_uid if email already exists.
 */
exports.syncUser = async (req, res, next) => {
  try {
    const { uid, email, name: tokenName } = req.firebaseUser || {};
    const rawBodyName = req.body?.name;
    const resolvedName = (rawBodyName && rawBodyName !== 'Dev User')
      ? rawBodyName
      : (tokenName && tokenName !== 'Dev User' ? tokenName : (email ? email.split('@')[0] : 'User'));

    // Try to find by firebase_uid first
    let user = uid ? await User.findOne({ firebase_uid: uid }) : null;

    if (!user && email) {
      // Check if user exists by email (email-first migration path)
      user = await User.findOne({ email });
    }

    if (user) {
      // Existing user — attach firebase_uid and heal any previous "Dev User" or placeholder name
      if (uid) user.firebase_uid = uid;
      if (resolvedName && (user.name === 'Dev User' || user.name.startsWith('Guest') || !user.name)) {
        user.name = resolvedName;
      }
      await user.save();
    } else {
      // New user — create
      user = await User.create({
        firebase_uid: uid,
        email: email || `${uid || Date.now()}@hireflow.ai`,
        name: resolvedName,
      });
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
 * Returns current authenticated user doc from MongoDB.
 */
exports.getMe = async (req, res, next) => {
  try {
    const { uid, email } = req.firebaseUser;

    const user = await User.findOne({
      $or: [{ firebase_uid: uid }, { email }],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found in database',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
