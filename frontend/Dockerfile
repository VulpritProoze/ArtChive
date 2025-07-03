FROM node:22-alpine

WORKDIR /frontend

COPY ./frontend/package*.json /frontend

RUN npm install

# copy all /frontend local to /frontend container
COPY ./frontend /frontend

EXPOSE 5173

# RUN npm run build

CMD ["npm", "run", "dev"]

# build with docker build -t artchive_frontend .
# run with docker run -d -p 5173:5173 --name dev2 artchive_frontend  