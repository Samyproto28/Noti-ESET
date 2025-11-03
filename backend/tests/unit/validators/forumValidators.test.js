import { body, param } from 'express-validator';
import {
  validatePost,
  validateComment,
  validateId,
  validatePostAndCommentId,
  handleValidationErrors
} from '../../../src/validators/forumValidators.js';
import { jest } from '@jest/globals';

// Mock de express-validator
jest.mock('express-validator', () => ({
  body: jest.fn(),
  param: jest.fn()
}));

// Mock de validationResult
jest.mock('express-validator', () => ({
  body: jest.fn(),
  param: jest.fn(),
  validationResult: jest.fn()
}));

import { validationResult } from 'express-validator';

describe('ForumValidators', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      params: {},
      body: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    mockNext = jest.fn();
  });

  describe('validatePost', () => {
    it('should validate post data correctly', () => {
      // Mock de las funciones de validación
      const mockTitleValidation = {
        isLength: jest.fn().mockReturnThis(),
        withMessage: jest.fn().mockReturnThis(),
        trim: jest.fn().mockReturnThis(),
        escape: jest.fn().mockReturnThis()
      };
      
      const mockContentValidation = {
        isLength: jest.fn().mockReturnThis(),
        withMessage: jest.fn().mockReturnThis(),
        trim: jest.fn().mockReturnThis(),
        escape: jest.fn().mockReturnThis()
      };
      
      const mockCategoryValidation = {
        optional: jest.fn().mockReturnThis(),
        isUUID: jest.fn().mockReturnThis(),
        withMessage: jest.fn().mockReturnThis()
      };

      body.mockImplementation((field) => {
        switch (field) {
          case 'title':
            return mockTitleValidation;
          case 'content':
            return mockContentValidation;
          case 'category_id':
            return mockCategoryValidation;
          default:
            return { isLength: jest.fn().mockReturnThis() };
        }
      });

      validatePost();

      expect(body).toHaveBeenCalledWith('title');
      expect(body).toHaveBeenCalledWith('content');
      expect(body).toHaveBeenCalledWith('category_id');
      
      expect(mockTitleValidation.isLength).toHaveBeenCalledWith({ min: 5, max: 200 });
      expect(mockTitleValidation.withMessage).toHaveBeenCalledWith('El título debe tener entre 5 y 200 caracteres');
      
      expect(mockContentValidation.isLength).toHaveBeenCalledWith({ min: 10, max: 2000 });
      expect(mockContentValidation.withMessage).toHaveBeenCalledWith('El contenido debe tener entre 10 y 2000 caracteres');
      
      expect(mockCategoryValidation.optional).toHaveBeenCalled();
      expect(mockCategoryValidation.isUUID).toHaveBeenCalledWith(4);
      expect(mockCategoryValidation.withMessage).toHaveBeenCalledWith('El ID de categoría debe ser un UUID válido');
    });
  });

  describe('validateComment', () => {
    it('should validate comment data correctly', () => {
      const mockContentValidation = {
        isLength: jest.fn().mockReturnThis(),
        withMessage: jest.fn().mockReturnThis(),
        trim: jest.fn().mockReturnThis(),
        escape: jest.fn().mockReturnThis()
      };

      body.mockReturnValue(mockContentValidation);

      validateComment();

      expect(body).toHaveBeenCalledWith('content');
      expect(mockContentValidation.isLength).toHaveBeenCalledWith({ min: 1, max: 1000 });
      expect(mockContentValidation.withMessage).toHaveBeenCalledWith('El contenido debe tener entre 1 y 1000 caracteres');
    });
  });

  describe('validateId', () => {
    it('should validate UUID ID correctly', () => {
      const mockIdValidation = {
        isUUID: jest.fn().mockReturnThis(),
        withMessage: jest.fn().mockReturnThis()
      };

      param.mockReturnValue(mockIdValidation);

      validateId('id');

      expect(param).toHaveBeenCalledWith('id');
      expect(mockIdValidation.isUUID).toHaveBeenCalledWith(4);
      expect(mockIdValidation.withMessage).toHaveBeenCalledWith('El ID debe ser un UUID válido');
    });
  });

  describe('validatePostAndCommentId', () => {
    it('should validate both post and comment IDs correctly', () => {
      const mockPostIdValidation = {
        isUUID: jest.fn().mockReturnThis(),
        withMessage: jest.fn().mockReturnThis()
      };
      
      const mockCommentIdValidation = {
        isUUID: jest.fn().mockReturnThis(),
        withMessage: jest.fn().mockReturnThis()
      };

      param.mockImplementation((field) => {
        switch (field) {
          case 'post_id':
            return mockPostIdValidation;
          case 'comment_id':
            return mockCommentIdValidation;
          default:
            return { isUUID: jest.fn().mockReturnThis() };
        }
      });

      validatePostAndCommentId();

      expect(param).toHaveBeenCalledWith('post_id');
      expect(param).toHaveBeenCalledWith('comment_id');
      
      expect(mockPostIdValidation.isUUID).toHaveBeenCalledWith(4);
      expect(mockPostIdValidation.withMessage).toHaveBeenCalledWith('El ID del post debe ser un UUID válido');
      
      expect(mockCommentIdValidation.isUUID).toHaveBeenCalledWith(4);
      expect(mockCommentIdValidation.withMessage).toHaveBeenCalledWith('El ID del comentario debe ser un UUID válido');
    });
  });

  describe('handleValidationErrors', () => {
    it('should call next when there are no validation errors', () => {
      const mockErrors = [];
      
      validationResult.mockReturnValue({
        isEmpty: jest.fn().mockReturnValue(true),
        array: jest.fn().mockReturnValue(mockErrors)
      });

      const middleware = handleValidationErrors();
      middleware(mockReq, mockRes, mockNext);

      expect(validationResult).toHaveBeenCalledWith(mockReq);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should return 400 status with errors when there are validation errors', () => {
      const mockErrors = [
        { msg: 'Title is required', param: 'title' },
        { msg: 'Content is too short', param: 'content' }
      ];
      
      validationResult.mockReturnValue({
        isEmpty: jest.fn().mockReturnValue(false),
        array: jest.fn().mockReturnValue(mockErrors)
      });

      const middleware = handleValidationErrors();
      middleware(mockReq, mockRes, mockNext);

      expect(validationResult).toHaveBeenCalledWith(mockReq);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error de validación',
        errors: mockErrors
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle empty errors array', () => {
      const mockErrors = [];
      
      validationResult.mockReturnValue({
        isEmpty: jest.fn().mockReturnValue(false),
        array: jest.fn().mockReturnValue(mockErrors)
      });

      const middleware = handleValidationErrors();
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error de validación',
        errors: []
      });
    });

    it('should handle different types of validation errors', () => {
      const mockErrors = [
        { 
          msg: 'Invalid UUID format', 
          param: 'category_id',
          value: 'invalid-uuid',
          location: 'body'
        },
        { 
          msg: 'Title too short', 
          param: 'title',
          value: 'Bad',
          location: 'body'
        },
        { 
          msg: 'Invalid post ID', 
          param: 'post_id',
          value: 'invalid-post-id',
          location: 'params'
        }
      ];
      
      validationResult.mockReturnValue({
        isEmpty: jest.fn().mockReturnValue(false),
        array: jest.fn().mockReturnValue(mockErrors)
      });

      const middleware = handleValidationErrors();
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error de validación',
        errors: mockErrors
      });
    });
  });
});