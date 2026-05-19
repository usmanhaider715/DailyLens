module.exports = {
  apps: [
    {
      name: 'dailylens-api',
      cwd: './server',
      script: 'server.js',
      instances: 1,
      env: { NODE_ENV: 'production', PORT: 5001 },
    },
    {
      name: 'dailylens-web',
      cwd: './web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 1,
      env: { NODE_ENV: 'production' },
    },
  ],
};
