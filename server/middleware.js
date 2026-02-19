const authMiddleware = (req, res, next) => {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.redirect('/');
    }
};

module.exports = authMiddleware;
