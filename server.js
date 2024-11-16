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

        // Check if the 'iss' claim matches your domain
        if (decoded.aud[0] !== AUTH0_AUDIENCE) {
            return res.status(403).json({ message: 'Not this domain' });
        }

        // Add user info to the request object
        req.user = {
            userId: decoded.sub,
            username: decoded.username,
        };

        next();
    });
};

const forwardRequest = (req, res) => {
    const {userId, username} = req.user;

    console.log(`Forwarding request to ${req.originalUrl}`);

    const serviceName = req.originalUrl.split('/')[1];

    // Modify the request path to remove the service-specific prefix (e.g., '/parser/*' becomes '/*')
    const servicePath = req.originalUrl.replace(`/${serviceName}`, '');

    axios({
        method: req.method,
        url: `http://${serviceName}:8080${servicePath}`,
        headers: {
            'userId': userId,
            'username': username,
            'Content-Type': req.headers['content-type'],
        },
        data: req.body,
    })
        .then(response => {
            res.status(response.status).json(response.data);
        })
        .catch(err => {
            if (err.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                res.status(err.response.status).json(err.response.data);
            } else if (err.request) {
                // The request was made but no response was received
                res.status(500).json({ message: 'No response received from the service', error: err.message });
            } else {
                // Something happened in setting up the request that triggered an Error
                res.status(500).json({ message: 'Error in setting up the request', error: err.message });
            }
        });
};


// Generic route handler for all /{service}/* requests
app.use('/:service/*', verifyToken, forwardRequest);

app.listen(port, () => {
    console.log(`Express server listening on port ${port}`);
});
