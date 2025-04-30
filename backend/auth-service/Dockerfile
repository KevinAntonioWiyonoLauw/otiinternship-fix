FROM node:18

WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies 
RUN npm install

# Copy the rest of the application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Create log directory
RUN mkdir -p /usr/src/app/logs

EXPOSE ${PORT}

CMD ["node", "main.js"]