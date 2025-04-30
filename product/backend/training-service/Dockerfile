FROM node:18-alpine

WORKDIR /usr/src/app

# Install dependencies required for bcrypt compilation
RUN apk add --no-cache make gcc g++ python3

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --build-from-source

# Copy the rest of the application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Create log directory
RUN mkdir -p /usr/src/app/logs

EXPOSE ${PORT}

CMD ["node", "main.js"]