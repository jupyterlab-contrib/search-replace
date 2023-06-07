/**
 * Configuration for Playwright using default from @jupyterlab/galata
 */
 const baseConfig = require('@jupyterlab/galata/lib/playwright-config');

 module.exports = {
   ...baseConfig,
   webServer: {
     command: 'jupyter lab --config jupyter_server_test_config.py',
     url: 'http://localhost:8888/lab',
     timeout: 120 * 1000,
     reuseExistingServer: !process.env.CI,
   },
}
