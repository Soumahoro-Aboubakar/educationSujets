
const Department = require('../models/Department');

exports.getDepartments = async (req, res, next) => {
  try {
    let query = Department.find();
    if (req.query.university) {
      query = query.where('university').equals(req.query.university);
    }
    const departments = await query.populate('university', 'name');
    res.status(200).json({
      success: true,
      data: departments,
    });
  } catch (error) {
    next(error);
  }
};

exports.createDepartment = async (req, res, next) => {
  try {
    const department = await Department.create(req.body);
    res.status(201).json({
      success: true,
      data: department,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateDepartment = async (req, res, next) => {
  try {
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!department) {
      return res.status(404).json({
        success: false,
        error: `Département non trouvé avec l'id ${req.params.id}`,
      });
    }
    res.status(200).json({
      success: true,
      data: department,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteDepartment = async (req, res, next) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) {
      return res.status(404).json({
        success: false,
        error: `Département non trouvé avec l'id ${req.params.id}`,
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
