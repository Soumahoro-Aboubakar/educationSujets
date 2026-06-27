
const Document = require('../models/Document');
const path = require('path');

exports.getDocuments = async (req, res, next) => {
  try {
    let query;

    const reqQuery = { ...req.query };
    const removeFields = ['select', 'sort', 'page', 'limit'];
    removeFields.forEach((param) => delete reqQuery[param]);

    let queryStr = JSON.stringify(reqQuery);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, (match) => `$${match}`);

    query = Document.find({ ...JSON.parse(queryStr), status: 'approved' })
      .populate('university', 'name abbreviation')
      .populate('department', 'name')
      .populate('level', 'name')
      .populate('semester', 'name')
      .populate('category', 'name')
      .populate('uploadedBy', 'name');

    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Document.countDocuments({ ...JSON.parse(queryStr), status: 'approved' });

    query = query.skip(startIndex).limit(limit);

    const documents = await query;

    const pagination = {};
    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: documents.length,
      pagination,
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

exports.getDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('university', 'name abbreviation')
      .populate('department', 'name')
      .populate('level', 'name')
      .populate('semester', 'name')
      .populate('category', 'name')
      .populate('uploadedBy', 'name');

    if (!document) {
      return res.status(404).json({
        success: false,
        error: `Document non trouvé avec l'id ${req.params.id}`,
      });
    }

    document.views += 1;
    await document.save();

    res.status(200).json({
      success: true,
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

exports.createDocument = async (req, res, next) => {
  try {
    req.body.uploadedBy = req.user.id;
    req.body.file = req.file.filename;
    req.body.fileType = path.extname(req.file.originalname).toLowerCase();
    req.body.fileSize = req.file.size;

    const document = await Document.create(req.body);

    res.status(201).json({
      success: true,
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateDocument = async (req, res, next) => {
  try {
    let document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: `Document non trouvé avec l'id ${req.params.id}`,
      });
    }

    if (
      document.uploadedBy.toString() !== req.user.id &&
      req.user.role !== 'admin' &&
      req.user.role !== 'sub-admin'
    ) {
      return res.status(401).json({
        success: false,
        error: 'Non autorisé à modifier ce document',
      });
    }

    document = await Document.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: `Document non trouvé avec l'id ${req.params.id}`,
      });
    }

    if (
      document.uploadedBy.toString() !== req.user.id &&
      req.user.role !== 'admin' &&
      req.user.role !== 'sub-admin'
    ) {
      return res.status(401).json({
        success: false,
        error: 'Non autorisé à supprimer ce document',
      });
    }

    await document.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyDocuments = async (req, res, next) => {
  try {
    const documents = await Document.find({ uploadedBy: req.user.id })
      .populate('university', 'name')
      .populate('department', 'name')
      .populate('level', 'name')
      .populate('semester', 'name')
      .populate('category', 'name');

    res.status(200).json({
      success: true,
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

exports.validateDocument = async (req, res, next) => {
  try {
    const { status } = req.body;
    let document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: `Document non trouvé avec l'id ${req.params.id}`,
      });
    }

    document.status = status;
    document.validatedBy = req.user.id;
    document.validatedAt = Date.now();

    await document.save();

    res.status(200).json({
      success: true,
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

exports.getPendingDocuments = async (req, res, next) => {
  try {
    const documents = await Document.find({ status: 'pending' })
      .populate('university', 'name')
      .populate('department', 'name')
      .populate('level', 'name')
      .populate('semester', 'name')
      .populate('category', 'name')
      .populate('uploadedBy', 'name');

    res.status(200).json({
      success: true,
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const totalDocuments = await Document.countDocuments();
    const approvedDocuments = await Document.countDocuments({ status: 'approved' });
    const pendingDocuments = await Document.countDocuments({ status: 'pending' });
    const totalViews = await Document.aggregate([
      { $group: { _id: null, total: { $sum: '$views' } },
    ]);
    const totalDownloads = await Document.aggregate([
      { $group: { _id: null, total: { $sum: '$downloads' } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalDocuments,
        approvedDocuments,
        pendingDocuments,
        totalViews: totalViews[0]?.total || 0,
        totalDownloads: totalDownloads[0]?.total || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
