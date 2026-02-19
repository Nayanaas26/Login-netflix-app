const path = require('path');
const dotenv = require("dotenv");

// Only load .env if not in production (Vercel provides env vars automatically)
if (process.env.NODE_ENV !== 'production') {
    const dotenvPath = path.join(__dirname, '.env');
    const result = dotenv.config({ path: dotenvPath });
    if (result.error) {
        console.log(".env file not found (this is fine in production)");
    }
}

const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const cors = require("cors");
const bodyParser = require("body-parser");
const session = require('express-session');
const authMiddleware = require('./middleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'netflix-clone-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // True in production
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Serve static files ONLY if NOT in serverless environment (Vercel handles this via CDN usually)
// However, for the monolith rewrite to work, we might need this if Vercel passes everything through.
// Let's keep it but wrap in try-catch to avoid path errors
try {
    app.use(express.static(path.join(__dirname, '../public')));
} catch (e) {
    console.error("Could not serve static files (expected in serverless):", e);
}

// MySQL Connection Pool
const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test the pool connection
db.getConnection((err, connection) => {
    if (err) {
        console.error("CRITICAL: Error connecting to MySQL Pool:", err.message);
        console.error("Ensure your database credentials in server/.env are correct and the database is accessible.");
    } else {
        console.log("Successfully connected to Aiven MySQL Pool");
        connection.release();
    }
});

// Create table if not exists using the pool
const createTableQuery = `
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fullname VARCHAR(100),
    email VARCHAR(100) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

db.query(createTableQuery, (err) => {
    if (err) console.error('Error creating table:', err);
    else console.log('Users table ready (Pool)');
});

// Protected static files for Netflix
try {
    app.use('/netflix', authMiddleware, express.static(path.join(__dirname, '../protected/netflix')));
} catch (e) {
    console.error("Could not serve protected files:", e);
}

// Routes

// Register
app.post('/register', async (req, res) => {
    const { fullname, email, password, confirmPassword } = req.body;

    if (!fullname || !email || !password || !confirmPassword) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)';
        const values = [fullname, email, hashedPassword];

        db.query(query, values, (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'Email already exists' });
                }
                console.error(err);
                return res.status(500).json({ error: 'Server error during registration' });
            }
            res.status(201).json({ message: 'User registered successfully' });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Encryption error' });
    }
});

// Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const query = 'SELECT * FROM users WHERE email = ?';
        db.query(query, [email], async (err, results) => {
            if (err) {
                console.error("Login Query Error:", err);
                return res.status(500).json({ error: 'Database error: ' + err.message });
            }

            if (results.length === 0) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const user = results[0];
            const isMatch = await bcrypt.compare(password, user.password);

            if (isMatch) {
                // Store user data in session
                req.session.userId = user.id;
                req.session.fullname = user.fullname;
                req.session.email = user.email;

                res.status(200).json({
                    message: 'Login successful',
                    user: { id: user.id, fullname: user.fullname, email: user.email },
                    redirect: '/netflix'
                });
            } else {
                res.status(401).json({ error: 'Invalid credentials' });
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Logout Error:", err);
            return res.status(500).json({ error: 'Could not log out' });
        }
        res.clearCookie('connect.sid'); // Clear session cookie
        res.redirect('/');
    });
});

// API to get current user info
app.get('/api/me', (req, res) => {
    if (req.session.userId) {
        res.json({ user: { fullname: req.session.fullname, email: req.session.email } });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// Health Check
app.get('/ping', (req, res) => {
    res.json({ message: 'pong v2', timestamp: new Date().toISOString() });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
