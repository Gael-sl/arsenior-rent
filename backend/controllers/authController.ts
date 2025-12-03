import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../config/db';
import { sendVerificationEmail, sendPasswordResetEmail } from '../config/mail';

interface User {
  id: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  rating: number;
  totalRentals: number;
  emailVerified: number;
  emailToken?: string;
  emailTokenExpires?: string;
  resetToken?: string;
  resetTokenExpires?: string;
  createdAt: string;
}

// Generar token aleatorio
const generateRandomToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Generar JWT
const generateToken = (userId: number, email: string, role: string): string => {
  const secret: Secret = (process.env.JWT_SECRET || 'default_secret') as Secret;
  const expiresIn: string | number = process.env.JWT_EXPIRES_IN || '7d';
  const options: SignOptions = { expiresIn: expiresIn as unknown as any };

  return jwt.sign(
    { userId, email, role },
    secret,
    options
  );
};

// REGISTRO
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    // Validaciones
    if (!email || !password || !firstName || !lastName || !phone) {
      res.status(400).json({ message: 'Todos los campos son requeridos' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    // Verificar si el usuario ya existe
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      res.status(400).json({ message: 'El email ya está registrado' });
      return;
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generar token de verificación
    const emailToken = generateRandomToken();
    const emailTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 horas

    // Insertar usuario (emailVerified = 0 por defecto)
    const result = db.prepare(`
      INSERT INTO users (email, password, firstName, lastName, phone, role, emailVerified, emailToken, emailTokenExpires)
      VALUES (?, ?, ?, ?, ?, 'user', 0, ?, ?)
    `).run(email, hashedPassword, firstName, lastName, phone, emailToken, emailTokenExpires);

    const userId = result.lastInsertRowid as number;

    // Enviar email de verificación
    await sendVerificationEmail(email, firstName, emailToken);

    // Obtener usuario creado
    const newUser = db.prepare(`
      SELECT id, email, firstName, lastName, phone, role, rating, totalRentals, emailVerified, createdAt
      FROM users WHERE id = ?
    `).get(userId) as Omit<User, 'password'>;

    // Generar token (aunque no esté verificado, puede hacer login pero con restricciones)
    const token = generateToken(newUser.id, newUser.email, newUser.role);

    res.status(201).json({
      message: 'Usuario registrado exitosamente. Por favor verifica tu email.',
      token,
      user: newUser,
      emailSent: true
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ message: 'Error al registrar usuario' });
  }
};

// LOGIN
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validaciones
    if (!email || !password) {
      res.status(400).json({ message: 'Email y contraseña son requeridos' });
      return;
    }

    // Buscar usuario
    const user = db.prepare(`
      SELECT * FROM users WHERE email = ?
    `).get(email) as User | undefined;

    if (!user) {
      res.status(401).json({ message: 'Credenciales inválidas' });
      return;
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ message: 'Credenciales inválidas' });
      return;
    }

    // Verificar que el email esté verificado
    if (!user.emailVerified) {
      res.status(403).json({ 
        message: 'Debes verificar tu email antes de iniciar sesión',
        emailNotVerified: true,
        email: user.email
      });
      return;
    }

    // Generar token
    const token = generateToken(user.id, user.email, user.role);

    // Remover password de la respuesta
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login exitoso',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error al iniciar sesión' });
  }
};

// OBTENER PERFIL (Ruta protegida)
export const getProfile = (req: Request, res: Response): void => {
  try {
    const userId = req.userId;

    const user = db.prepare(`
      SELECT id, email, firstName, lastName, phone, role, rating, totalRentals, createdAt
      FROM users WHERE id = ?
    `).get(userId);

    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ message: 'Error al obtener perfil' });
  }
};

// VERIFICAR TOKEN
export const verifyToken = (req: Request, res: Response): void => {
  // Si llegamos aquí, el token es válido (pasó por el middleware)
  res.json({ valid: true, userId: req.userId, role: req.userRole });
};

// ACTUALIZAR PERFIL
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { firstName, lastName, phone } = req.body;

    if (!firstName || !lastName || !phone) {
      res.status(400).json({ message: 'Todos los campos son requeridos' });
      return;
    }

    db.prepare(`
      UPDATE users 
      SET firstName = ?, lastName = ?, phone = ?
      WHERE id = ?
    `).run(firstName, lastName, phone, userId);

    const updatedUser = db.prepare(`
      SELECT id, email, firstName, lastName, phone, role, rating, totalRentals, createdAt
      FROM users WHERE id = ?
    `).get(userId);

    res.json({
      message: 'Perfil actualizado exitosamente',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ message: 'Error al actualizar perfil' });
  }
};

// CAMBIAR CONTRASEÑA
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: 'Se requieren ambas contraseñas' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
      return;
    }

    // Obtener usuario
    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(userId) as { password: string } | undefined;

    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    // Verificar contraseña actual
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      res.status(401).json({ message: 'Contraseña actual incorrecta' });
      return;
    }

    // Hash de nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, userId);

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ message: 'Error al cambiar contraseña' });
  }
};

// VERIFICAR EMAIL
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ message: 'Token requerido' });
      return;
    }

    // Buscar usuario con este token
    const user = db.prepare(`
      SELECT id, email, firstName, emailToken, emailTokenExpires, emailVerified 
      FROM users WHERE emailToken = ?
    `).get(token) as User | undefined;

    if (!user) {
      // Quizás ya fue verificado - buscar por si el usuario ya está verificado
      res.status(400).json({ 
        message: 'Este enlace ya fue utilizado o ha expirado. Si ya verificaste tu cuenta, inicia sesión.',
        alreadyUsed: true
      });
      return;
    }

    // Verificar expiración
    if (user.emailTokenExpires && new Date(user.emailTokenExpires) < new Date()) {
      res.status(400).json({ message: 'El token ha expirado. Solicita uno nuevo.' });
      return;
    }

    // Marcar como verificado
    db.prepare(`
      UPDATE users 
      SET emailVerified = 1, emailToken = NULL, emailTokenExpires = NULL 
      WHERE id = ?
    `).run(user.id);

    // Obtener usuario completo para login automático
    const verifiedUser = db.prepare(`
      SELECT id, email, firstName, lastName, phone, role, rating, totalRentals, emailVerified, createdAt
      FROM users WHERE id = ?
    `).get(user.id) as Omit<User, 'password'>;

    // Generar token para login automático
    const jwtToken = generateToken(verifiedUser.id, verifiedUser.email, verifiedUser.role);

    res.json({ 
      message: 'Email verificado exitosamente. ¡Bienvenido!',
      verified: true,
      token: jwtToken,
      user: verifiedUser
    });
  } catch (error) {
    console.error('Error al verificar email:', error);
    res.status(500).json({ message: 'Error al verificar email' });
  }
};

// REENVIAR EMAIL DE VERIFICACIÓN
export const resendVerificationEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Email requerido' });
      return;
    }

    const user = db.prepare(`
      SELECT id, email, firstName, emailVerified 
      FROM users WHERE email = ?
    `).get(email) as User | undefined;

    if (!user) {
      // No revelar si el email existe o no
      res.json({ message: 'Si el email existe, recibirás un correo de verificación.' });
      return;
    }

    if (user.emailVerified) {
      res.status(400).json({ message: 'Este email ya está verificado' });
      return;
    }

    // Generar nuevo token
    const emailToken = generateRandomToken();
    const emailTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      UPDATE users SET emailToken = ?, emailTokenExpires = ? WHERE id = ?
    `).run(emailToken, emailTokenExpires, user.id);

    // Enviar email
    await sendVerificationEmail(user.email, user.firstName, emailToken);

    res.json({ message: 'Email de verificación enviado' });
  } catch (error) {
    console.error('Error al reenviar verificación:', error);
    res.status(500).json({ message: 'Error al enviar email' });
  }
};

// SOLICITAR RECUPERACIÓN DE CONTRASEÑA
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Email requerido' });
      return;
    }

    const user = db.prepare(`
      SELECT id, email, firstName 
      FROM users WHERE email = ?
    `).get(email) as User | undefined;

    // Siempre responder lo mismo para no revelar si el email existe
    if (!user) {
      res.json({ message: 'Si el email existe, recibirás instrucciones para recuperar tu contraseña.' });
      return;
    }

    // Generar token de reset
    const resetToken = generateRandomToken();
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hora

    db.prepare(`
      UPDATE users SET resetToken = ?, resetTokenExpires = ? WHERE id = ?
    `).run(resetToken, resetTokenExpires, user.id);

    // Enviar email
    await sendPasswordResetEmail(user.email, user.firstName, resetToken);

    res.json({ message: 'Si el email existe, recibirás instrucciones para recuperar tu contraseña.' });
  } catch (error) {
    console.error('Error en forgot password:', error);
    res.status(500).json({ message: 'Error al procesar solicitud' });
  }
};

// RESTABLECER CONTRASEÑA
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ message: 'Token y nueva contraseña son requeridos' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
      return;
    }

    // Validar formato de contraseña (1 mayúscula, 1 número)
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      res.status(400).json({ 
        message: 'La contraseña debe tener al menos 8 caracteres, 1 mayúscula y 1 número' 
      });
      return;
    }

    // Buscar usuario con este token
    const user = db.prepare(`
      SELECT id, resetToken, resetTokenExpires 
      FROM users WHERE resetToken = ?
    `).get(token) as User | undefined;

    if (!user) {
      res.status(400).json({ message: 'Token inválido o expirado' });
      return;
    }

    // Verificar expiración
    if (user.resetTokenExpires && new Date(user.resetTokenExpires) < new Date()) {
      res.status(400).json({ message: 'El token ha expirado. Solicita uno nuevo.' });
      return;
    }

    // Hash de nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña y limpiar token
    db.prepare(`
      UPDATE users 
      SET password = ?, resetToken = NULL, resetTokenExpires = NULL 
      WHERE id = ?
    `).run(hashedPassword, user.id);

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('Error al restablecer contraseña:', error);
    res.status(500).json({ message: 'Error al restablecer contraseña' });
  }
};

// VALIDAR TOKEN DE RESET
export const validateResetToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({ valid: false, message: 'Token requerido' });
      return;
    }

    const user = db.prepare(`
      SELECT id, resetToken, resetTokenExpires 
      FROM users WHERE resetToken = ?
    `).get(token) as User | undefined;

    if (!user) {
      res.status(400).json({ valid: false, message: 'Token inválido' });
      return;
    }

    if (user.resetTokenExpires && new Date(user.resetTokenExpires) < new Date()) {
      res.status(400).json({ valid: false, message: 'Token expirado' });
      return;
    }

    res.json({ valid: true });
  } catch (error) {
    console.error('Error al validar token:', error);
    res.status(500).json({ valid: false, message: 'Error al validar token' });
  }
};