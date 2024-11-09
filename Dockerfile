# Stage 1: Build the app
FROM node:20 AS build

WORKDIR /app

# Copy the package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install dependencies only (this avoids copying node_modules)
RUN npm install --production

# Copy the rest of the application files
COPY . .

# Stage 2: Prepare the runtime image
FROM node:20-slim

WORKDIR /app

# Copy only the necessary files from the build stage
COPY --from=build /app /app

# Expose the port the app runs on
EXPOSE 3000

# Command to run your app
CMD ["node", "server.js"]
