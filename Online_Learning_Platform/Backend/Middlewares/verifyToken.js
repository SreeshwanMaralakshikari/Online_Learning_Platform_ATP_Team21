import jwt from 'jsonwebtoken'
import { config } from 'dotenv';

config();

// Middleware to verify JWT token from Authorization header and check role
export const verifyToken = (...allowedRoles) => {
    return (req, res, next) => {
        // Read token from Authorization header (Bearer <token>)
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "Please Login First" });
        }
        try {
            const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
            console.log(decodedToken);

            if (allowedRoles.length > 0 && !allowedRoles.includes(decodedToken.role)) {
                return res.status(403).json({ message: "You are not authorized" });
            }

            req.user = decodedToken;
            next();
        } catch (err) {
            res.status(401).json({ message: "Session Expired. Please Relogin" });
        }
    };
};
