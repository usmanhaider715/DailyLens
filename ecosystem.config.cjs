module.exports = {
  apps: [
    {
      name: 'dailylens-api',
      cwd: './server',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
      },
    },
    {
      name: 'dailylens-web',
      cwd: './web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000 -H 127.0.0.1',
      instances: 1,
      autorestart: true,
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production',
        API_URL: 'http://127.0.0.1:5001',
      },
    },
  ],
};
