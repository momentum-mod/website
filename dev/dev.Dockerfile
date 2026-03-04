FROM node:24-alpine as website_dev

#####################################
# WEB DEV WITH FRONTEND AND BACKEND #
#####################################

# Verify .env exists by trying to copy it. If it doesn't exist, build fails.
COPY .env .env

WORKDIR /app

# Install dependencies (cached if package files don't change)
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Make the startup script executable
RUN chmod +x dev/start.sh

# Expose ports
EXPOSE 3000 4200

CMD ["./dev/start.sh"]