module.exports = {
    apps: [
      {
        name: "venuesafar-backend",
        script: "./src/server.js",
        instances: 1,
        exec_mode: "fork",
        watch: false,
        max_memory_restart: "500M",
        env_production: {
          NODE_ENV: "production"
        },
        env_development: {
          NODE_ENV: "development"
        },
        error_file: "./logs/pm2-error.log",
        out_file: "./logs/pm2-out.log",
        log_date_format: "YYYY-MM-DD HH:mm:ss"
      }
    ]
  };