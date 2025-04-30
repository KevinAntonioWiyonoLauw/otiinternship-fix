FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies 
RUN npm install

# Bundle app source
COPY . .

# Create log directory
RUN mkdir -p /usr/src/app/logs
RUN chmod 777 /usr/src/app/logs

EXPOSE ${PORT}

CMD ["node", "index.js"]