module.exports = {
  apps: [
    {
      name: "jarvis-worker-server",
      script: "./packages/workers/dist/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        SERVER_PORT: 3001
      }
    },
    {
      name: "jarvis-web-dashboard",
      script: "./node_modules/next/dist/bin/next",
      args: "start apps/web -p 3000",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
