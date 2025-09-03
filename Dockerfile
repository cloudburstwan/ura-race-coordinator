FROM node:20
RUN apt-get update && apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev libtool autoconf automake && rm -rf /var/lib/apt/lists/*
COPY . /app
WORKDIR /app
RUN npm install
RUN npm install canvas
RUN npm install -g typescript
RUN tsc
CMD ["node", "dist/index.js"]