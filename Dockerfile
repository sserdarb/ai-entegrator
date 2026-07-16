# API Entegratör — sserdarb/ai-entegrator — Angular 20 + Gemini
FROM node:22-alpine AS builder
WORKDIR /app
ARG API_KEY
COPY package*.json ./
RUN npm install
COPY . .
COPY fix-index.cjs .
RUN npm run build
# Angular build has no process.env shim; inject window.process before app bundle runs.
RUN sed -i "s|</head>|<script>window.process={env:{API_KEY:\"$API_KEY\",GEMINI_API_KEY:\"$API_KEY\"}};</script></head>|" dist/index.html
RUN node fix-index.cjs

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY spa-nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
