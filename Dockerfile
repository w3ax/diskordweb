FROM node:latest
WORKDIR /app

COPY package.json ./
COPY package-lock.json ./

RUN npm install

COPY . .

EXPOSE 5000

ENV VITE_API_SERVER=http://46.63.69.24:3000/api/

CMD ["npm", "run", "dev"]