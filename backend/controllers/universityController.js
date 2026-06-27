
const University = require('../models/University');

exports.getUniversities = async (req, res, next) => {
  try {
    const universities = await University.find();
    res.status(200).json({
      success: true,
      data: universities,
    });
  } catch (error) {
    next(error);
  }
};

exports.createUniversity = async (req, res, next) => {
  try {
    const university = await University.create(req.body);
    res.status(201).json({
      success: true,
      data: university,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUniversity = async (req, res, next) => {
  try {
    const university = await University.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!university) {
      return res.status(404).json({
        success: false,
        error: `Université non trouvée avec l'id ${req.params.id}`,
      });
    }
    res.status(200).json({
      success: true,
      data: university,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteUniversity = async (req, res, next) => {
  try {
    const university = await University.findByIdAndDelete(req.params.id);
    if (!university) {
      return res.status(404).json({
        success: false,
        error: `Université non trouvée avec l'id ${req.params.id}`,
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
