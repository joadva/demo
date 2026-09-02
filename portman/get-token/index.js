const axios = require('axios').default;
const fs = require('fs');

(async () => {
  const args = process.argv.slice(2);

  const response = await axios.post('https://6f35zjv989.execute-api.us-east-1.amazonaws.com/api/login', {
    username: args[1],
    password: args[2]
  });

  const token = response.data.token;

  let portmanEnv = `PORTMAN_TOKEN=${token}\n`;
  portmanEnv += `PORTMAN_USERNAME=${args[1]}\n`;
  portmanEnv += `PORTMAN_PASSWORD=${args[2]}\n`;

  const portmanCliPath = args[0];
  const portmanCliJsonFile = JSON.parse(fs.readFileSync(portmanCliPath, 'utf-8'));
  fs.writeFileSync(portmanCliJsonFile.envFile, portmanEnv, 'utf-8');
})();