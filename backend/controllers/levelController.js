
const Level = require('../models/Level');

exports.getLevels = async (req, res, next) => {
  try {
    const levels = await Level.find().sort('order');
    res.status(200).json({
      success: true,
      data: levels,
    });
  } catch (error) {
    next(error);
  }
};

exports.createLevel = async (req, res, next) => {
  try {
    const level = await Level.create(req.body);
    res.status(201).json({
      success: true,
      data: level,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateLevel = async (req, res, next) => {
  try {
    const level = await Level.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!level) {
      return res.status(404).json({
        success: false,
        error: `Niveau non trouvé avec l'id ${req.params.id}`,
      });
    }
    res.status(200).json({
      success: true,
      data: level,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteLevel = async (req, res, next) => {
  try {
    const level = await Level.findByIdAndDelete(req.params.id);
    if (!level) {
      return res.status(404).json({
        success: false,
        error: `Niveau non trouvé avec l'id ${req.params.id}`,
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
