# Set Base Image and version tag
FROM node:22.6.0-slim
# Set a directory
WORKDIR /gradell
# For security Concern, create a non-root user use the user for starting container
RUN addgroup --system --gid 1001 gradell && adduser -D -H -S -s /bin/false -u 1001 node
# COPY all source code into the directory
COPY . . /gradell/
# Run npm install command so install dependencies and packages
RUN npm install
# Optionally change diretory ownership to non-root user
RUN chown -R node:gradell /gradell
# Set non-root user so that it can be used
USER node
# Expose Port 
EXPOSE 3000
## Set CMD or ENTRYPOINT to start the container
CMD [ "npm", "start" ]

