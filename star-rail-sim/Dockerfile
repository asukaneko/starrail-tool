# Stage 1: Build the Vue application
FROM docker.m.daocloud.io/node:lts-alpine as build-stage

WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm config set registry https://registry.npmmirror.com
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM docker.m.daocloud.io/nginx:stable-alpine as production-stage

# Copy the built files from the build stage to the Nginx html directory
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
