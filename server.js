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
    const { userId, username } = req.user;

    console.log(`Forwarding request to ${req.originalUrl}`);
    console.log(`Request headers: ${JSON.stringify(req.headers)}`);

    const serviceName = req.originalUrl.split('/')[1];
    const servicePath = req.originalUrl.replace(`/${serviceName}`, '');

    // Forward the Content-Type and body to the backend service
    axios({
        method: req.method,
        url: `http://${serviceName}:8080${servicePath}`,
        headers: {
            'userId': userId,
            'username': username,
            'Content-Type': req.headers['content-type'], // Ensure Content-Type is passed
        },
        data: req.body,  // Forward the body
    })
        .then(response => {
            res.status(response.status).json(response.data);
        })
        .catch(err => {
            if (err.response) {
                res.status(err.response.status).json(err.response.data);
            } else if (err.request) {
                res.status(500).json({ message: 'No response received from the service', error: err.message });
            } else {
                res.status(500).json({ message: 'Error in setting up the request', error: err.message });
            }
        });
};


// Generic route handler for all /{service}/* requests
app.use('/:service/*', verifyToken, forwardRequest);

app.listen(port, () => {
    console.log(`Express server listening on port ${port}`);
});
