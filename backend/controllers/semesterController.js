
const Semester = require('../models/Semester');

exports.getSemesters = async (req, res, next) => {
  try {
    const semesters = await Semester.find().sort('order');
    res.status(200).json({
      success: true,
      data: semesters,
    });
  } catch (error) {
    next(error);
  }
};

exports.createSemester = async (req, res, next) => {
  try {
    const semester = await Semester.create(req.body);
    res.status(201).json({
      success: true,
      data: semester,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateSemester = async (req, res, next) => {
  try {
    const semester = await Semester.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!semester) {
      return res.status(404).json({
        success: false,
        error: `Semestre non trouvé avec l'id ${req.params.id}`,
      });
    }
    res.status(200).json({
      success: true,
      data: semester,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteSemester = async (req, res, next) => {
  try {
    const semester = await Semester.findByIdAndDelete(req.params.id);
    if (!semester) {
      return res.status(404).json({
        success: false,
        error: `Semestre non trouvé avec l'id ${req.params.id}`,
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
