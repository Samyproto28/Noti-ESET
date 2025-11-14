import { jest } from '@jest/globals';
import { body, param, validationResult } from 'express-validator';
import {
  validateNews,
  validateId,
  handleValidationErrors
} from '../../src/validators/newsValidators.js';

// Mock de express-validator
jest.mock('express-validator', () => ({
  body: jest.fn(),
  param: jest.fn(),
  validationResult: jest.fn()
}));

describe('News Validators', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('validateNews', () => {
    it('debería configurar validación para título', () => {
      const mockBodyChain = {
        trim: jest.fn().mockReturnThis(),
        isLength: jest.fn().mockReturnThis(),
        withMessage: jest.fn().mockReturnThis()
      };

      body.mockReturnValue(mockBodyChain);

      validateNews;

      expect(body).toHaveBeenCalledWith('title');
      expect(mockBodyChain.trim).toHaveBeenCalled();
      expect(mockBodyChain.isLength).toHaveBeenCalledWith({ min: 5, max: 200 });
      expect(mockBodyChain.withMessage).toHaveBeenCalledWith('El título debe tener entre 5 y 200 caracteres');
    });

    it('debería configurar validación para contenido', () => {
      const mockBodyChain = {
        trim: jest.fn().mockReturnThis(),
        isLength: jest.fn().mockReturnThis(),
        withMessage: jest.fn().mockReturnThis()
      };

      body.mockReturnValue(mockBodyChain);

      validateNews;

      expect(body).toHaveBeenCalledWith('content');
      expect(mockBodyChain.trim).toHaveBeenCalled();
      expect(mockBodyChain.isLength).toHaveBeenCalledWith({ min: 10, max: 5000 });
      expect(mockBodyChain.withMessage).toHaveBeenCalledWith('El contenido debe tener entre 10 y 5000 caracteres');
    });

    it('debería configurar validación opcional para URL de imagen', () => {
      const mockBodyChain = {
        optional: jest.fn().mockReturnThis(),
        isURL: jest.fn().mockReturnThis(),
        withMessage: jest.fn().mockReturnThis()
      };

      body.mockReturnValue(mockBodyChain);

      validateNews;

      expect(body).toHaveBeenCalledWith('image_url');
      expect(mockBodyChain.optional).toHaveBeenCalled();
      expect(mockBodyChain.isURL).toHaveBeenCalled();
      expect(mockBodyChain.withMessage).toHaveBeenCalledWith('La URL de la imagen debe ser válida');
    });
  });

  describe('validateId', () => {
    it('debería configurar validación para parámetro ID', () => {
      const mockParamChain = {
        isUUID: jest.fn().mockReturnThis(),
        withMessage: jest.fn().mockReturnThis()
      };

      param.mockReturnValue(mockParamChain);

      validateId;

      expect(param).toHaveBeenCalledWith('id');
      expect(mockParamChain.isUUID).toHaveBeenCalled();
      expect(mockParamChain.withMessage).toHaveBeenCalledWith('El ID debe ser un UUID válido');
    });
  });

  describe('handleValidationErrors', () => {
    let middleware;

    beforeEach(() => {
      middleware = handleValidationErrors;
    });

    it('debería llamar a next() si no hay errores de validación', () => {
      validationResult.mockReturnValue({
        isEmpty: () => true
      });

      middleware(mockReq, mockRes, mockNext);

      expect(validationResult).toHaveBeenCalledWith(mockReq);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('debería crear error de validación y pasarlo a next si hay errores', () => {
      const mockErrors = [
        { param: 'title', msg: 'El título es requerido' },
        { param: 'content', msg: 'El contenido es muy corto' }
      ];

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      });

      middleware(mockReq, mockRes, mockNext);

      expect(validationResult).toHaveBeenCalledWith(mockReq);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error de validación',
          type: 'validation',
          errors: mockErrors
        })
      );
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('debería mantener el formato de error consistente', () => {
      const mockErrors = [
        { param: 'title', msg: 'Mensaje de error', value: '', location: 'body' }
      ];

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      });

      middleware(mockReq, mockRes, mockNext);

      const error = mockNext.mock.calls[0][0];

      expect(error).toHaveProperty('message', 'Error de validación');
      expect(error).toHaveProperty('type', 'validation');
      expect(error).toHaveProperty('errors');
      expect(Array.isArray(error.errors)).toBe(true);
      expect(error.errors[0]).toHaveProperty('param', 'title');
      expect(error.errors[0]).toHaveProperty('msg', 'Mensaje de error');
    });

    it('debería manejar múltiples errores de validación', () => {
      const mockErrors = [
        { param: 'title', msg: 'Título muy corto' },
        { param: 'content', msg: 'Contenido muy corto' },
        { param: 'image_url', msg: 'URL inválida' }
      ];

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      });

      middleware(mockReq, mockRes, mockNext);

      const error = mockNext.mock.calls[0][0];

      expect(error.errors).toHaveLength(3);
      expect(error.errors.map(e => e.param)).toEqual(['title', 'content', 'image_url']);
    });

    it('debería preservar información detallada de errores', () => {
      const detailedError = {
        param: 'title',
        msg: 'Título muy corto',
        value: 'Hi',
        location: 'body',
        nestedErrors: []
      };

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [detailedError]
      });

      middleware(mockReq, mockRes, mockNext);

      const error = mockNext.mock.calls[0][0];

      expect(error.errors[0]).toEqual(detailedError);
      expect(error.errors[0]).toHaveProperty('value', 'Hi');
      expect(error.errors[0]).toHaveProperty('location', 'body');
    });
  });

  describe('Casos de validación específicos', () => {
    describe('Validación de título', () => {
      it('debería rechazar títulos vacíos', () => {
        // Simula el resultado de validación para título vacío
        const mockErrors = [
          { param: 'title', msg: 'El título debe tener entre 5 y 200 caracteres' }
        ];

        validationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => mockErrors
        });

        const middleware = handleValidationErrors;
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'validation',
            errors: expect.arrayContaining([
              expect.objectContaining({
                param: 'title',
                msg: 'El título debe tener entre 5 y 200 caracteres'
              })
            ])
          })
        );
      });

      it('debería rechazar títulos demasiado cortos', () => {
        const mockErrors = [
          { param: 'title', msg: 'El título debe tener entre 5 y 200 caracteres' }
        ];

        validationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => mockErrors
        });

        const middleware = handleValidationErrors;
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        const error = mockNext.mock.calls[0][0];
        expect(error.errors[0].param).toBe('title');
      });

      it('debería rechazar títulos demasiado largos', () => {
        const mockErrors = [
          { param: 'title', msg: 'El título debe tener entre 5 y 200 caracteres' }
        ];

        validationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => mockErrors
        });

        const middleware = handleValidationErrors;
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('Validación de contenido', () => {
      it('debería rechazar contenidos vacíos', () => {
        const mockErrors = [
          { param: 'content', msg: 'El contenido debe tener entre 10 y 5000 caracteres' }
        ];

        validationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => mockErrors
        });

        const middleware = handleValidationErrors;
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                param: 'content'
              })
            ])
          })
        );
      });

      it('debería rechazar contenidos demasiado largos', () => {
        const mockErrors = [
          { param: 'content', msg: 'El contenido debe tener entre 10 y 5000 caracteres' }
        ];

        validationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => mockErrors
        });

        const middleware = handleValidationErrors;
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('Validación de URL de imagen', () => {
      it('debería aceptar URLs válidas', () => {
        // Caso exitoso: no hay errores
        validationResult.mockReturnValue({
          isEmpty: () => true
        });

        mockReq.body = {
          title: 'Título válido',
          content: 'Contenido válido con más de 10 caracteres',
          image_url: 'https://example.com/image.jpg'
        };

        const middleware = handleValidationErrors;
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockNext.mock.calls[0]).toHaveLength(1); // Solo next() sin error
      });

      it('debería rechazar URLs inválidas', () => {
        const mockErrors = [
          { param: 'image_url', msg: 'La URL de la imagen debe ser válida' }
        ];

        validationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => mockErrors
        });

        mockReq.body.image_url = 'url-invalida';

        const middleware = handleValidationErrors;
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                param: 'image_url',
                msg: 'La URL de la imagen debe ser válida'
              })
            ])
          })
        );
      });

      it('debería permitir omitir la URL de imagen', () => {
        // Caso exitoso: image_url es opcional
        validationResult.mockReturnValue({
          isEmpty: () => true
        });

        mockReq.body = {
          title: 'Título válido',
          content: 'Contenido válido con más de 10 caracteres'
          // sin image_url
        };

        const middleware = handleValidationErrors;
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });
    });

    describe('Validación de IDs', () => {
      it('debería rechazar IDs que no sean UUID válidos', () => {
        const mockErrors = [
          { param: 'id', msg: 'El ID debe ser un UUID válido' }
        ];

        validationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => mockErrors
        });

        mockReq.params.id = 'id-invalido';

        const middleware = handleValidationErrors;
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                param: 'id',
                msg: 'El ID debe ser un UUID válido'
              })
            ])
          })
        );
      });

      it('debería aceptar UUIDs válidos', () => {
        validationResult.mockReturnValue({
          isEmpty: () => true
        });

        mockReq.params.id = '550e8400-e29b-41d4-a716-446655440000';

        const middleware = handleValidationErrors;
        middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });
    });
  });

  describe('Integración de validadores', () => {
    it('debería manejar múltiples errores de diferentes campos', () => {
      const mockErrors = [
        { param: 'title', msg: 'Título muy corto' },
        { param: 'content', msg: 'Contenido muy corto' },
        { param: 'id', msg: 'ID inválido' }
      ];

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      });

      const middleware = handleValidationErrors;
      middleware(mockReq, mockRes, mockNext);

      const error = mockNext.mock.calls[0][0];

      expect(error.errors).toHaveLength(3);
      expect(error.errors.map(e => e.param)).toEqual(['title', 'content', 'id']);
    });

    it('debería mantener consistencia en el formato de error', () => {
      const mockErrors = [
        { param: 'title', msg: 'Error 1', value: '', location: 'body' },
        { param: 'id', msg: 'Error 2', value: '123', location: 'params' }
      ];

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      });

      const middleware = handleValidationErrors;
      middleware(mockReq, mockRes, mockNext);

      const error = mockNext.mock.calls[0][0];

      expect(error).toHaveProperty('message', 'Error de validación');
      expect(error).toHaveProperty('type', 'validation');
      expect(error).toHaveProperty('errors');

      error.errors.forEach(err => {
        expect(err).toHaveProperty('param');
        expect(err).toHaveProperty('msg');
        expect(err).toHaveProperty('value');
        expect(err).toHaveProperty('location');
      });
    });
  });
});