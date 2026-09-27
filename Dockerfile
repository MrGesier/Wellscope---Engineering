FROM nginx:stable-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY app/ /usr/share/nginx/html/
EXPOSE 8080
