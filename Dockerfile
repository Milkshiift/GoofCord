# Use an official Node.js runtime as a parent image
FROM node

# Set the working directory to /app
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install Wine and other dependencies for windows build
RUN --mount=type=cache,id=apt-get \
    dpkg --add-architecture i386 \
    && apt-get update \
    && apt-get install -y wine \
    && apt-get install -y wine32 \
    && apt-get install -y rpm \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy the entrypoint script into the container
COPY entrypoint.sh /app/entrypoint.sh

# Make the entrypoint script executable
RUN chmod +x /app/entrypoint.sh

# Set the entrypoint to the script
ENTRYPOINT ["/app/entrypoint.sh"]