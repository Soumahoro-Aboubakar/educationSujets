
const User = require('../models/User');

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find();
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: `Utilisateur non trouvé avec l'id ${req.params.id}`,
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

// Seuls ces champs sont modifiables par cette route : le mot de passe, les statuts
// financiers et le parrainage passent par des services dédiés.
const UPDATABLE_FIELDS = ['name', 'firstName', 'lastName', 'phone', 'email', 'role', 'accountStatus', 'statusReason'];

exports.updateUser = async (req, res, next) => {
  try {
    const updates = Object.fromEntries(
      UPDATABLE_FIELDS.filter((field) => req.body[field] !== undefined).map((field) => [field, req.body[field]])
    );
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        error: `Utilisateur non trouvé avec l'id ${req.params.id}`,
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

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: `Utilisateur non trouvé avec l'id ${req.params.id}`,
      });
    }
    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};
