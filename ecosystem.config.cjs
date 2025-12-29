module.exports = {
    apps: [{
        name: "hgtv-automation",
        script: "./index.js",
        watch: false,
        ignore_watch: ["node_modules", "logs", "data", "screenshots"],
        time: true,
        log_date_format: "YYYY-MM-DD HH:mm:ss Z",
        error_file: "./logs/pm2-error.log",
        out_file: "./logs/pm2-out.log",
        merge_logs: true,
        autorestart: true,
        env: {
            NODE_ENV: "production",
        }
    }]
}
