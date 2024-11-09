const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config(); // Load environment variables from .env file
const app = express();
const port = 3000;

const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;
const AUTH0_SECRET_KEY = process.env.AUTH0_SECRET_KEY;

// Middleware to verify the token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Get token from Authorization header

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    jwt.verify(token, AUTH0_SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        console.log(decoded.aud[0]);

        // Check if the 'iss' claim matches your domain
        if (decoded.aud[0] !== AUTH0_AUDIENCE) {
            return res.status(403).json({ message: 'Not this domain' });
        }

        // Add user info to the request object
        req.user = {
            userId: decoded.sub,
            username: decoded.username,
        };
        console.log(decoded);

        next();
    });
};

// Generic route handler to forward requests to the corresponding service
const forwardRequest = (req, res) => {
    const { userId, username } = req.user;

    const serviceName = req.originalUrl.split('/')[1];
    console.log(serviceName);

    // Modify the request path to remove the service-specific prefix (e.g., '/parser/*' becomes '/*')
    const servicePath = req.originalUrl.replace(`/${serviceName}`, '');
    console.log(servicePath);

    axios({
        method: req.method,
        url: `http://${serviceName}:8080${servicePath}`,
        headers: {
            'userID': userId,
            'username': username,
        },
        data: req.body,
    })
        .then(response => {
            res.status(response.status).json(response.data);
        })
        .catch(err => {
            res.status(500).json({ message: 'Error forwarding request', error: err.message });
        });
};

// Generic route handler for all /{service}/* requests
app.use('/:service/*', verifyToken, forwardRequest);

app.listen(port, () => {
    console.log(`Express server listening on port ${port}`);
});
