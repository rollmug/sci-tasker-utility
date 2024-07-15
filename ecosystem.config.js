module.exports = {
    apps: [{
        script: 'tasker.mjs',
        name: 'tasker',
        env: {
            TASKER_PORT: 7003,
            TASKER_HOST: "0.0.0.0",
        }
    }]
};