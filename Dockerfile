FROM nginx:1.27-alpine
COPY . /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
# deploy/ maste ligga i byggkontexten for raden ovan, men ska inte servas
RUN rm -rf /usr/share/nginx/html/deploy
EXPOSE 8080
