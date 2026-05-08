import jwt from 'jsonwebtoken';
export const JWT_SECRET = process.env.JWT_SECRET || 'trulicares-dev-secret-please-change';
export function generateToken(user) {
    return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}
export function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    try {
        const token = header.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = { id: decoded.id, email: decoded.email, role: decoded.role, name: decoded.name };
        next();
    }
    catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}
export function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    });
}
export function requireCaregiver(req, res, next) {
    requireAuth(req, res, () => {
        if (req.user?.role !== 'caregiver') {
            return res.status(403).json({ error: 'Caregiver access required' });
        }
        next();
    });
}
export function requireFamily(req, res, next) {
    requireAuth(req, res, () => {
        if (req.user?.role !== 'family') {
            return res.status(403).json({ error: 'Family access required' });
        }
        next();
    });
}
