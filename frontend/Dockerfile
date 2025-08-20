FROM node:22-alpine

WORKDIR /app

COPY ./frontend/package*.json .

RUN npm install

EXPOSE 5173

# RUN npm run build

CMD ["npm", "run", "dev"]

# build with docker build -t artchive_frontend .
# run with docker run -d -p 5173:5173 --name dev2 artchive_frontend  
# docker exec -it artchive-frontend-1 sh