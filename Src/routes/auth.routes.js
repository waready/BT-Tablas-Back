import * as AuthController from '../controllers/auth.controller.js'

export default async function authRoutes(app) {
    app.post('/login', {
        schema: {
            tags: ['Auth'],
            body: {
                type: 'object',
                required: ['email', 'password'],
                properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } }
            }
        }
    }, (req, reply) => AuthController.login(app, req, reply))

    app.post('/register', {
        schema: {
            tags: ['Auth'],
            body: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } }
        }
    }, (req, reply) => AuthController.register(app, req, reply))
}
